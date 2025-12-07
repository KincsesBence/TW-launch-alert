import { IonBadge, IonButton, IonCol, IonContent, IonFab, IonFabButton, IonGrid, IonHeader, IonIcon, IonItem, IonItemDivider, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonPage, IonProgressBar, IonRow, IonTitle, IonToolbar, useIonToast, useIonViewDidEnter } from '@ionic/react';
import './Home.css';
import { useContext, useEffect, useRef, useState } from 'react';
import { add, options } from 'ionicons/icons';
import StorageManager  from '../components/storageManager'
import { useHistory } from 'react-router';
import PlanModal from '../components/PlanModal';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { capacitorExactAlarm } from 'capacitor-exact-alarm'
import { plan } from '../store/appSlice';
import { RootState } from '../store/store';

interface Props{
 planId: number | null
}


const Home: React.FC<Props> = ({planId}:Props)  => {
  const { t, i18n } = useTranslation();
  const [present] = useIonToast();
  const history = useHistory();
  const [modalState, setModalState] = useState<boolean>(false);
  const plans = useSelector((state:RootState) => state.app.plans);

  useEffect(()=>{
    if(planId==null) return;
    openPlan(planId)
  },[planId])

  const presentToast = (text:string,color:string) => {
    present({
      message: text,
      duration: 1500,
      position: 'middle',
      color: color
    });
  };

  async function removePlan(plan:plan){
    for (const id of plan.alarmIds) {
      capacitorExactAlarm.cancelAlarm({ alarmId: id })
    }
    await StorageManager.removePlan(plan.id);
    presentToast(t('plan_removed'),'success');
  }

  function openPlan(id:number){
    history.push(`/plan/${id}`);
  }

  function openPlanModal(){
    setModalState(true);
  }

  return (
    <IonPage>
      <IonHeader >
        <IonToolbar color='primary'>
          <IonTitle>TW Launch Alert</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonList inset={true}>
          <IonItemDivider>
            <IonLabel>{t('plans')}:</IonLabel>
          </IonItemDivider>
          {plans.length==0 &&
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
          <>
            {plans.length==0 ?
              <IonGrid>
                <IonRow class='ion-text-center'> 
                  <IonCol>
                    <IonButton expand="block" onClick={openPlanModal}>{t('add_plan')}</IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>
              :
              <IonFab slot="fixed" vertical="bottom" horizontal="end">
                <IonFabButton onClick={openPlanModal}>
                  <IonIcon icon={add}></IonIcon>
                </IonFabButton>
              </IonFab>
            }
          </>
      </IonContent>
      {modalState && <PlanModal
        finishHandler={()=>{setModalState(false)}} 
        isOpen={modalState}
        planIn={null}
      />}
    </IonPage>
  );
};

export default Home;
