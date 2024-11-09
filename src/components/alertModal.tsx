import {IonBadge, IonButton, IonButtons, IonCheckbox, IonChip, IonCol, IonContent, IonGrid, IonHeader, IonIcon, IonInput, IonItem, IonItemDivider, IonItemOption, IonLabel, IonList, IonModal, IonRange, IonRow, IonSelect, IonSelectOption, IonTitle, IonToolbar, useIonToast } from '@ionic/react';
import React, { useEffect, useState } from 'react';
import StorageManager  from './storageManager'
import { attack, plan } from '../pages/Home';
import { useTranslation } from 'react-i18next';
import { openOutline } from 'ionicons/icons';

type Ref = {
    setState:(state:boolean)=>void
}

type Props = {
    finishHandler:()=>void
    plan:plan | null
    ids:number[]
}

const alertModal: React.ForwardRefRenderFunction<Ref,Props> = (props,ref) => {
    const { t, i18n } = useTranslation();
    const [present] = useIonToast();
    const [open,setOpen] = useState<boolean>(false);
    const [attacks,setAttacks] = useState<attack[]>([])

    React.useImperativeHandle(ref,()=>({
        setState:(state:boolean)=>{            
            setOpen(state);
        }
    }));

    useEffect(()=>{
        console.log('propIDs',props.ids);
        if(props.ids.length>0){
            loadAttacks();
            setOpen(true);
        }
    },[props.ids])

    const presentToast = (text:string,color:string) => {
        present({
          message: text,
          duration: 3000,
          position: 'middle',
          color: color
        });
    };

    function formatDate(date:number){
        return new Intl.DateTimeFormat(i18n.language, {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false,
        }).format(date);
    }

    function loadAttacks(){
        let temp:attack[] = [];
        props.ids.forEach(element => {
            temp.push(props.plan!.attacks[element])
        });
        if(temp.length>0){
            setAttacks([...temp]);
        }
    }

    async function launchSent(){
        let planTemp={...props.plan!}
        props.ids.forEach(element => {            
            planTemp.attacks[element].alertSent=true;
            planTemp.attacks[element].alertPending=false;
        });
        console.log(planTemp);
        
        await StorageManager.editPlan(planTemp);
        props.finishHandler();
        setOpen(false);
    }

    return (
        <IonModal isOpen={open}>
            <IonHeader>
            <IonToolbar color='primary'>
                <IonButtons slot="start">
                </IonButtons>
                <IonTitle>{t('notification')}</IonTitle>
                <IonButtons slot="end">
                </IonButtons>
            </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <IonList>
                    <IonItemDivider>{t('launches')}</IonItemDivider>
                    {attacks.map((attack:attack,index)=>{return(
                        <IonItem key={index}>
                        <img height={20} width={20} src={`/${attack.isAttack? "attack":"support"}.png`} slot="start"/>
                        <IonLabel>
                          <h2><b>#{attack.id}</b> <img src={'/unit_'+attack.unitSpeed+'.png'} /> {formatDate(attack.launchDate)}</h2>
                          <p><b>{t('village')}: <a style={{color:'#603000'}}>{attack.villageToName}</a></b></p>          
                        </IonLabel>
                        <IonChip>
                             <a href={attack.launchLink}><IonIcon  icon={openOutline}/></a>
                        </IonChip>
                      </IonItem>
                    )})}
                </IonList>
                <IonGrid>
                    <IonRow class='ion-text-center'>
                        <IonCol>
                            <IonButton className='ion-text-center' onClick={launchSent}>{t('launches_sent')}</IonButton>
                        </IonCol>
                    </IonRow>
              </IonGrid>
            </IonContent>
        </IonModal>
    );
};

export default React.forwardRef(alertModal);
