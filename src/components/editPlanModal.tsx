import {IonBadge, IonButton, IonButtons, IonChip, IonCol, IonContent, IonGrid, IonHeader, IonInput, IonItem, IonItemDivider, IonItemOption, IonLabel, IonList, IonModal, IonRange, IonRow, IonSelect, IonSelectOption, IonTitle, IonToolbar, useIonToast } from '@ionic/react';
import React, { useState } from 'react';
import StorageManager  from './storageManager'
import { plan } from '../pages/Home';
import { LocalNotifications } from '@capacitor/local-notifications';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';
import {channels} from '../App';
import { useTranslation } from 'react-i18next';

type Ref = {
    setState:(state:boolean)=>void
}

type Props = {
    finishHandler:()=>void
    plan:plan | null
}

const addPlanModal: React.ForwardRefRenderFunction<Ref,Props> = (props,ref) => {
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
            setPlan(props.plan!);
            setRangeBefore(props.plan!.alertBeforeMins)
            setRangeCombine(props.plan!.combineMinutes)
            setSound(props.plan!.channelId!)
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

    async function confirmEdit(){

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

        await StorageManager.editPlan(temp);
        createChannnels(temp.channelId);

        presentToast(t('success_edit_plan'),'success');

        props.finishHandler();
        setOpen(false);
    }
    
    function openAppSettings(){
        NativeSettings.openAndroid({
            option: AndroidSettings.ApplicationDetails,
          });          
    }

    async function createChannnels(channelName:string){
        let res = await LocalNotifications.listChannels();
        let cind=res.channels.findIndex((channel)=>{return channel.id==channelName})
        if(cind>-1) return;
        let cind2=channels.findIndex((channel)=>{return channel.id==channelName})
        if(cind2==-1) return;
        LocalNotifications.createChannel(channels[cind2]);
    }
    

    return (
        <IonModal isOpen={open}>
            <IonHeader>
            <IonToolbar color='primary'>
                <IonButtons slot="start">
                <IonButton onClick={()=>{setOpen(false)}}>{t('cancel')}</IonButton>
                </IonButtons>
                <IonTitle>{t('edit_plan')}</IonTitle>
                <IonButtons slot="end">
                <IonButton strong={true} onClick={confirmEdit}>
                    {t('edit')}
                </IonButton>
                </IonButtons>
            </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <IonGrid>
                    {plan &&
                    <>
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
                                <IonRange value={rangeBefore} pin={true} ticks={true} snaps={true} min={0} max={30} onIonChange={(e)=>{setRangeBefore(parseInt(e.target.value.toString()))}} labelPlacement="stacked" label={`Indítások elött ${rangeBefore} perccel riasszon`}></IonRange>
                            </IonItem>
                            <IonItem>
                                <IonRange value={rangeCombine} pin={true} ticks={true} snaps={true} min={0} max={30} onIonChange={(e)=>{setRangeCombine(parseInt(e.target.value.toString()))}} labelPlacement="stacked" label={`Indítások összevonása ${rangeCombine} percenként`}></IonRange>
                            </IonItem>
                        </IonList>
                    </>
                    } 
                </IonGrid>
            </IonContent>
        </IonModal>
    );
};

export default React.forwardRef(addPlanModal);
