import {IonBadge, IonButton, IonButtons, IonChip, IonCol, IonContent, IonGrid, IonHeader, IonInput, IonItem, IonItemDivider, IonItemOption, IonLabel, IonList, IonModal, IonRange, IonRow, IonSelect, IonSelectOption, IonTitle, IonToolbar, useIonToast } from '@ionic/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import StorageManager  from './storageManager'
import { CapacitorBarcodeScanner } from '@capacitor/barcode-scanner';
import { attack, plan } from '../pages/Home';
import { LocalNotifications } from '@capacitor/local-notifications';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import {channels} from '../App';
import { useTranslation } from 'react-i18next';

type Ref = {
    setState:(state:boolean)=>void
}

type Props = {
    finishHandler:()=>void
}


const editPlanModal: React.ForwardRefRenderFunction<Ref,Props> = (props,ref) => {
    const { t, i18n } = useTranslation();
    const [present] = useIonToast();
    const [open,setOpen] = useState<boolean>(false);
    const [plan,setPlan] = useState<plan | null>(null);
    const [rangeCombine,setRangeCombine] = useState<number>(1);
    const [rangeBefore,setRangeBefore] = useState<number>(1);
    const [sound,setSound] = useState<string>('default');


    React.useImperativeHandle(ref,()=>({
        setState:(state:boolean)=>{
            setOpen(state);
            setPlan(null);
        }
    }));

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

        let temp = plan;

        temp.combineMinutes = rangeCombine;
        temp.alertBeforeMins = rangeBefore; 
        temp.channelId = sound;

        await StorageManager.createPlan(temp);
        createChannnels(temp.channelId);

        presentToast(t('success_add_plan'),'success');

        props.finishHandler();
        setOpen(false);
    }

    async function createChannnels(channelName:string){
        let res = await LocalNotifications.listChannels();
        let cind=res.channels.findIndex((channel)=>{return channel.id==channelName})
        if(cind>-1) return;
        let cind2=channels.findIndex((channel)=>{return channel.id==channelName})
        if(cind2==-1) return;
        LocalNotifications.createChannel(channels[cind2]);
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
                channelId:'',
            }
        }else{
            tempPlan=plan;
        }
        
        const mainFrags = result.replace('twla://','').split('/');
        const attacksData = mainFrags[1].split(';');
        const header = mainFrags[0].split(',');
        //1:2,hu89.klanhaboru.hu,ASG arma
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
    function openAppSettings(){
        NativeSettings.openAndroid({
            option: AndroidSettings.ApplicationDetails,
          });          
    }
    

    return (
        <IonModal isOpen={open}>
            <IonHeader>
            <IonToolbar color='primary'>
                <IonButtons slot="start">
                <IonButton onClick={()=>{setOpen(false)}}>{t('cancel')}</IonButton>
                </IonButtons>
                <IonTitle>{t('new_plan')}</IonTitle>
                <IonButtons slot="end">
                <IonButton strong={true} onClick={confirmAdd}>
                    {t('add')}
                </IonButton>
                </IonButtons>
            </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <IonGrid>
                    {(plan==null || plan!.loadedPages.length<plan!.maxPage)  &&
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
                                <IonSelect value={sound} onIonChange={(e)=>{setSound(e.target.value)}} label="Értesítés hang" labelPlacement="stacked">
                                    <IonSelectOption value="default">{t('default')}</IonSelectOption>
                                    {channels.map((channel)=>{
                                     return(<IonSelectOption key={channel.id} value={channel.id}>{channel.name}</IonSelectOption>)   
                                    })}
                                </IonSelect>
                            </IonItem>
                            {sound=='default' &&
                                <IonItem>
                                    <IonChip style={{textAlign:'center'}} onClick={openAppSettings} color="warning">{t('to_set_def_sound')}</IonChip>
                                </IonItem>
                            }
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

export default React.forwardRef(editPlanModal);
