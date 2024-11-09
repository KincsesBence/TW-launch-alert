import { IonBadge, IonButton, IonCol, IonContent, IonFab, IonFabButton, IonGrid, IonHeader, IonIcon, IonItem, IonItemDivider, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonPage, IonProgressBar, IonRow, IonTitle, IonToolbar, useIonToast, useIonViewDidEnter } from '@ionic/react';
import './Home.css';
import {ActionPerformed, Channel, LocalNotifications, LocalNotificationSchema} from "@capacitor/local-notifications";
import { useContext, useEffect, useRef, useState } from 'react';
import { add, options } from 'ionicons/icons';
import StorageManager  from '../components/storageManager'
import { useHistory } from 'react-router';
import AddPlanModal from '../components/addPlanModal';
import { useTranslation } from 'react-i18next';


export type attack = {
  id:number,
  villageFrom:number;
  villageTo:number;
  villageToName:String
  unitSpeed:String;
  launchDate:number;
  launchLink:string;
  isAttack:boolean;
  alertSent:boolean;
  alertPending:boolean;
  grouped:boolean
}

export type plan ={
  id:number,
  name:string,
  channelId:string,
  maxPage:number,
  loadedPages:number[],
  domain:string,
  world:string
  combineMinutes:number,
  alertBeforeMins:number,
  armed:Boolean,
  attacks:attack[],
}
interface homeProps{
  planId: number | null,
  alertIds:number[],
}
    
type addPlanModalHandler = React.ElementRef<typeof AddPlanModal>;
let OpenedID=-1;
const Home: React.FC<homeProps> = (props)  => {
  const { t, i18n } = useTranslation();
  const [present] = useIonToast();
  const history = useHistory();
  const [loaded,setLoaded] = useState<boolean>(false);
  const [plans,setPlan] = useState<plan[]>([]);
  const modalRef = useRef<addPlanModalHandler>(null);

  const presentToast = (text:string,color:string) => {
    present({
      message: text,
      duration: 1500,
      position: 'middle',
      color: color
    });
  };

  useEffect(()=>{
    LocalNotifications.requestPermissions();
    load();
  },[])

  useEffect(()=>{
    console.log(props.alertIds);
    if(props.alertIds.length>0 && props.planId!=null){
      history.push(`/plan/${props.planId}`)
    }
  },[props.alertIds,props.planId])

  async function load(){
    let res = await StorageManager.getPlans();
    setTimeout(()=>{
      setPlan([...res]);
      setLoaded(true);
    },500);
  }

  async function removePlan(plan:plan){
    await StorageManager.removePlan(plan.id);
    presentToast(t('plan_removed'),'success');
    load();
  }

  function openPlan(id:number){
    history.push(`/plan/${id}`);
  }

  return (
    <IonPage>
      <IonHeader >
        <IonToolbar color='primary'>
          <IonTitle>TW Launch Alert</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {!loaded && <IonProgressBar type="indeterminate"></IonProgressBar>}
        <IonList inset={true}>
          <IonItemDivider>
            <IonLabel>{t('plans')}:</IonLabel>
          </IonItemDivider>
          {loaded && plans.length==0 &&
            <IonItem>
              <IonLabel>{t('no_items')}...</IonLabel>
            </IonItem>
          }
          {plans.map((plan:plan,index)=>{return(
            <IonItemSliding key={plan.id}>
              <IonItem button onClick={()=>{openPlan(plan.id)}}>
                <IonLabel>{plan.name} ({plan.world}) </IonLabel>
                <IonBadge>
                    {plan.attacks.length}
                </IonBadge>
              </IonItem>
              <IonItemOptions>
                <IonItemOption onClick={()=>{removePlan(plan)}} color="danger">{t('delete')}</IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          )})
            
          }
        </IonList>
        {loaded &&
          <>
            {plans.length==0 ?
              <IonGrid>
                <IonRow class='ion-text-center'> 
                  <IonCol>
                    <IonButton expand="block" onClick={()=>{modalRef.current?.setState(true)}}>{t('add_plan')}</IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>
              :
              <IonFab slot="fixed" vertical="bottom" horizontal="end">
                <IonFabButton onClick={()=>{modalRef.current?.setState(true)}}>
                  <IonIcon icon={add}></IonIcon>
                </IonFabButton>
              </IonFab>
            }
          </>
        }
        <AddPlanModal finishHandler={()=>{load()}} ref={modalRef}/>
      </IonContent>
    </IonPage>
  );
};

export default Home;
