import {IonBadge, IonButton, IonButtons, IonChip, IonCol, IonContent, IonGrid, IonHeader, IonIcon, IonInput, IonItem, IonItemDivider, IonItemOption, IonLabel, IonList, IonModal, IonRange, IonRow, IonSelect, IonSelectOption, IonTitle, IonToolbar, useIonToast } from '@ionic/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import StorageManager  from './storageManager'
import { CapacitorBarcodeScanner } from '@capacitor/barcode-scanner';
import { useTranslation } from 'react-i18next';
import { capacitorExactAlarm } from 'capacitor-exact-alarm'
import { musicalNotesOutline } from 'ionicons/icons';
import { attack, plan } from '../store/appSlice';


type Ref = {
    setState:(state:boolean)=>void
}

type Props = {
    finishHandler:(completed:boolean)=>void
    isOpen:boolean;
    planIn:plan | null;
}


const PlanModal: React.FC<Props> = ({finishHandler,isOpen,planIn}:Props) => {
    const { t, i18n } = useTranslation();
    const [present] = useIonToast();
    const [rangeCombine,setRangeCombine] = useState<number>(1);
    const [rangeBefore,setRangeBefore] = useState<number>(1);
    const [sound,setSound] = useState<string>('default');
    const [plan,setPlan] = useState<plan | null>(planIn);

    useEffect(()=>{
        if(planIn === null) return
        setSound(planIn.sound);
        setRangeCombine(planIn.combineMinutes);
        setRangeBefore(planIn.alertBeforeMins);
    },[])
    
    const presentToast = (text:string,color:string) => {
        present({
          message: text,
          duration: 3000,
          position: 'middle',
          color: color
        });
    };

    async function confirmAdd(){
        if(plan==null){
            presentToast(t('load_plan_fisrt'),'danger');
            return;
        }
        if(plan.loadedPages.length!=plan.maxPage){
            presentToast(t('load_all_pages'),'danger');
            return;
        }

        let temp = structuredClone(plan);

        temp.combineMinutes = rangeCombine;
        temp.alertBeforeMins = rangeBefore; 
        temp.sound = sound;
        console.log(JSON.stringify(temp));
        
        await StorageManager.createPlan(temp);
        console.log('PlanCreated');
        

        presentToast(t('success_add_plan'),'success');

        finishHandler(true);
        setPlan(null);
        setSound('default');
    }

     async function confirmEdit(){
        if(plan==null){
            presentToast(t('load_plan_fisrt'),'danger');
            return;
        }
        if(plan.loadedPages.length!=plan.maxPage){
            presentToast(t('load_all_pages'),'danger');
            return;
        }

        let temp = structuredClone(plan);

        temp.combineMinutes = rangeCombine;
        temp.alertBeforeMins = rangeBefore; 
        temp.sound = sound;

        await StorageManager.editPlan(temp);

        presentToast(t('success_edit_plan'),'success');

        finishHandler(true);
    }


    async function scan(){
        try {
          const result = await CapacitorBarcodeScanner.scanBarcode({
            hint: 17,
            cameraDirection: 1,
            scanInstructions:t('scan_the_QR')
          });
          loadScanResult(result.ScanResult);
        } catch (e) {
          throw e;
        }
    }

    async function loadScanResult(result:string){
        if(!result.includes('twla://')){
            presentToast(t('invalid_QR'),'danger');
            return;
        }
        let attacks:attack[]=[];
        let tempPlan:plan;

        if(plan==null){
            tempPlan={
                id: await StorageManager.getNewPlanId(),
                name:'',
                maxPage:0,
                loadedPages:[],
                domain:'',
                world:'',
                combineMinutes:0,
                alertBeforeMins:0,
                attacks:[],
                armed:false,
                sound:'',
                alarmIds:[]
            }
        }else{
            tempPlan=plan;
        }
        
        const mainFrags = result.replace('twla://','').split('/');
        const attacksData = mainFrags[1].split(';');
        const header = mainFrags[0].split(',');
        let pageNum,maxPage,planName,url,world,domain

        if(header.length==1 && tempPlan.maxPage==0){
            presentToast(t('load_first_page'),'danger');
            return;
        }

        if(header.length==1){
            pageNum=parseInt(header[0],16);
            
        }else{
            let page=header[0].split(':')
            pageNum=parseInt(page[0],16);
            maxPage=parseInt(page[1],16);
            planName=header[2];
            url=header[1].split('.');
            world=url[0];
            domain=`${url[1]}.${url[2]}`;
        }

        if(tempPlan.loadedPages.includes(pageNum)){
            presentToast(t('QR_already_scanned'),'warning');
            return;
        }

        tempPlan.loadedPages.push(pageNum);

        if(header.length>1){
            tempPlan.maxPage=maxPage!;
            tempPlan.name=planName!;
            tempPlan.world=world!;
            tempPlan.domain=domain!;
        }        

        const unitCode = ['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'];
    
        attacksData.forEach((attack)=>{
            let frags = attack.split(',');
            if(attack=="") return;
            let tempAttack:attack={
                id:tempPlan.attacks.length+1,
                villageFrom: parseInt(frags[3],16),
                villageTo: parseInt(frags[4],16),
                villageToName: frags[5],
                unitSpeed: unitCode![parseInt(frags[1],16)],
                launchDate:parseInt(frags[2],16),
                launchLink: '',
                isAttack: frags[0]=='1',
                alertPending:false,
                alertSent:false,
                grouped:false
            }
            let smartlink='';

            console.log('frags',JSON.stringify(frags));
            for (let i = 6; i < frags.length; i++) {
              let unitfrag=frags[i].split(':');
              let unit = unitCode[parseInt(unitfrag[0],16)];
              let count = parseInt(unitfrag[1],16);
              smartlink+=`&${unit}=${count}`;
            }
            
            
            tempAttack.launchLink=`https://${tempPlan.world}.${tempPlan.domain}/game.php?village=${tempAttack.villageFrom}&screen=place&target=${tempAttack.villageTo}${smartlink}`,
            tempPlan.attacks.push(tempAttack);
        })
        presentToast(t('QR_success_read'),'success');
        setPlan({...tempPlan});
    }
    
    async function selectSound(){
        const sound = await capacitorExactAlarm.pickAlarmSound();
        setSound(sound.uri)
    }

    function getTitle(uri:string){
        if(!uri.includes('?')){
            return "Default sound";
        }
        const queryString = uri.split('?')[1]; 

        const params:any = {};

        if(!queryString.includes('&')){
            return "Default sound";
        }

        queryString.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            params[key as keyof object] = decodeURIComponent(value);
        });

        if(Object.hasOwn(params,'title')){
            return params.title
        }else{
            return "Default sound";
        }
         
    }

    return (
        <IonModal
            onDidDismiss={()=>{finishHandler(false)}}
            isOpen={isOpen}
        >
            <IonHeader>
            <IonToolbar color='primary'>
                <IonButtons slot="start">
                <IonButton onClick={()=>{finishHandler(false)}}>{t('cancel')}</IonButton>
                </IonButtons>
                {!planIn ?
                    <IonTitle>{t('new_plan')}</IonTitle>
                    :
                    <IonTitle>{t('edit_plan')}</IonTitle>
                }
                <IonButtons slot="end">
                {!planIn ?
                    <IonButton strong={true} onClick={confirmAdd}>
                        {t('add')}
                    </IonButton>
                    :
                    <IonButton strong={true} onClick={confirmEdit}>
                        {t('edit')}
                    </IonButton>
                }
                </IonButtons>
            </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <IonGrid>
                    {!planIn && (plan==null || plan!.loadedPages.length<plan!.maxPage)  &&
                    <>
                        <IonRow class='ion-text-center'>
                            <IonCol>
                                <img height={150} src='/qr-code-scan-icon.svg'/>
                            </IonCol>
                        </IonRow>
                        <IonRow class='ion-text-center'>
                            <IonCol>
                                <IonButton onClick={scan}>{t('scan')}</IonButton>
                            </IonCol>
                        </IonRow>
                    </>
                    }
                    {plan && plan?.maxPage>0 &&
                    <>
                        <IonRow class='ion-text-center'>
                            <IonCol>
                                <b>{plan.loadedPages.length}/{plan.maxPage}{t('page_loaded')}</b>
                            </IonCol>
                        </IonRow>
                        <IonList>
                            <IonItemDivider>
                                <IonLabel>{t('plan')}:</IonLabel>
                            </IonItemDivider>
                            <IonItem>
                                <IonCol>
                                    <b>{t('name')}:</b>
                                </IonCol>
                                <IonCol>
                                    <b>{plan.name}</b>
                                </IonCol>
                            </IonItem>
                            <IonItem>
                                <IonCol>
                                    <b>Domain:</b>
                                </IonCol>
                                <IonCol>
                                    <b>{plan.domain}</b>
                                </IonCol>
                            </IonItem>
                            <IonItem>
                                <IonCol>
                                    <b>{t('world')}:</b>
                                </IonCol>
                                <IonCol>
                                    <b>{plan.world}</b>
                                </IonCol>
                            </IonItem>
                            <IonItem>
                                <IonCol>
                                    <b>{t('num_of_attacks')}:</b>
                                </IonCol>
                                <IonCol>
                                    <IonBadge>
                                        {plan.attacks.length}
                                    </IonBadge>
                                </IonCol>
                            </IonItem>
                            <IonItem>
                                 <IonCol>
                                    <b>{t('sound')}:</b>
                                </IonCol>
                                <IonCol>
                                    <IonButton onClick={selectSound}>
                                        <IonIcon slot="start" icon={musicalNotesOutline} />
                                        {getTitle(sound)}
                                     </IonButton>
                                </IonCol>
                            </IonItem>
                            <IonItem>
                                <IonRange pin={true} ticks={true} snaps={true} min={0} max={30} onIonChange={(e)=>{setRangeBefore(parseInt(e.target.value.toString()))}} labelPlacement="stacked" label={`Indítások elött ${rangeBefore} percel`}></IonRange>
                            </IonItem>
                            <IonItem>
                                <IonRange pin={true} ticks={true} snaps={true} min={0} max={30} onIonChange={(e)=>{setRangeCombine(parseInt(e.target.value.toString()))}} labelPlacement="stacked" label={`Indítások összevonása ${rangeCombine} percenként`}></IonRange>
                            </IonItem>
                        </IonList>
                    </>
                    } 
                </IonGrid>
            </IonContent>
        </IonModal>
    );
};

export default PlanModal;
