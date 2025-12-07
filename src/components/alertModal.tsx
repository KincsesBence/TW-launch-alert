import {IonBadge, IonButton, IonButtons, IonCheckbox, IonChip, IonCol, IonContent, IonGrid, IonHeader, IonIcon, IonInput, IonItem, IonItemDivider, IonItemOption, IonLabel, IonList, IonModal, IonRange, IonRow, IonSelect, IonSelectOption, IonTitle, IonToolbar, useIonToast } from '@ionic/react';
import React, { useEffect, useState } from 'react';
import StorageManager  from './storageManager'
import { useTranslation } from 'react-i18next';
import { openOutline } from 'ionicons/icons';
import { attack, plan } from '../store/appSlice';
import { capacitorExactAlarm } from 'capacitor-exact-alarm';

type Props = {
    finishHandler:()=>void
    open:boolean
    plan:plan | null
    ids:number[]
}

const AlertModal: React.FC<Props> = ({finishHandler,open,plan,ids}:Props) => {
    const { t, i18n } = useTranslation();
    const [present] = useIonToast();
    const [attacks,setAttacks] = useState<attack[]>([])

    useEffect(()=>{
        if(!ids && !plan) return
        console.log('AlertModal',JSON.stringify(ids));
        const att:attack[] = plan!.attacks.filter((attack:attack) => ids.includes(attack.id))
        setAttacks(att)
    },[ids,plan])

    function formatDate(date:number){
        return new Intl.DateTimeFormat(i18n.language, {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false,
        }).format(date);
    }

    async function launchSent(){
        let planTemp = structuredClone(plan);
        ids.forEach(id => {      
            let idx = planTemp!.attacks.findIndex(attack => attack.id==id)
            if(idx>-1){
                planTemp!.attacks[idx].alertSent=true;
                planTemp!.attacks[idx].alertPending=false;
            }
        });
        await StorageManager.editPlan(planTemp!);
        capacitorExactAlarm.stopAlarm();
        finishHandler();
    }

    return (
        <IonModal 
            isOpen={open}
            onDidDismiss={finishHandler}
        >
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

export default AlertModal;
