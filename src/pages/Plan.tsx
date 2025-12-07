import { IonAvatar, IonBackButton, IonButton, IonButtons, IonCol, IonContent, IonFab, IonFabButton, IonGrid, IonHeader, IonIcon, IonItem, IonItemDivider, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonPage, IonRow, IonTitle, IonToggle, IonToolbar, useIonToast } from '@ionic/react';
import './Home.css';
import StorageManager  from '../components/storageManager'
import { useEffect, useRef, useState } from 'react';
import { alarm, checkmarkDoneCircleOutline, flash, notifications, notificationsOutline, planet, settingsOutline, time } from 'ionicons/icons';
import { App } from '@capacitor/app';
import { useTranslation } from 'react-i18next';
import { capacitorExactAlarm } from 'capacitor-exact-alarm';
import { attack, plan, updateAlertIds } from '../store/appSlice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import PlanModal from '../components/PlanModal';
import AlertModal from '../components/AlertModal';

interface Props{
  openPlan:string;
}

declare global {
  interface Window {
    plugins: any;
  }
}
    
let IsSleeping:boolean=false;

const Plan: React.FC<Props> = ({openPlan}:Props) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { t, i18n } = useTranslation();
  const [plan,setPlan] = useState<plan | null>(null);
  const plans = useSelector((state:RootState) => state.app.plans);
  const alertIds = useSelector((state:RootState) => state.app.alertIds);
  const [alertIn,setAlertIn] = useState<string | null>(null);
  const [present] = useIonToast();
  const [modalState, setModalState] = useState<boolean>(false);
  const [alertState, setAlertState] = useState<boolean>(false);
  const dispatch = useDispatch();

  useEffect(()=>{
    console.log('useEffect[plans,openPlan]',JSON.stringify(openPlan),JSON.stringify(plans));
    
    let idx= plans.findIndex(plan => plan.id === parseInt(openPlan))
    if(idx==-1) return;
    setPlan(plans[idx]);

    let inter = setInterval(()=>{
      console.log("update");
      setPlan(structuredClone(plans[idx]));
    },15000);

    return () => {
      clearInterval(inter);
  	};
  },[plans,openPlan])

  useEffect(()=>{
    if(alertIds === null) return;
    setAlertState(true);
  },[alertIds])

  useEffect(()=>{
   
    if(plan === null) return
     console.log('useEffect[plan]',plan);
      /*console.log('navigate');
      const section = document.querySelector( '.timeDivide' );
      if(!section) return
      setTimeout(()=>{
        section.scrollIntoView( { behavior: 'smooth', block: 'start' } );
      },500)*/
      getNextAlert();
  },[plan])

  const presentToast = (text:string,color:string) => {
    present({
      message: text,
      duration: 3000,
      position: 'middle',
      color: color
    });
  };

  App.addListener('appStateChange', ({ isActive }) => {
    if(IsSleeping && isActive){
      IsSleeping=false;
    }else if(!isActive && !IsSleeping){
      IsSleeping=true;
    }
  });

  function getNextAlert(){
    if(plan === null) return;

    if(!plan.armed){
      setAlertIn(null);
      return
    }

    let ind = plan!.attacks.findIndex(
      (attack:attack)=>{
        return attack.alertPending && !attack.grouped && attack.launchDate-plan.alertBeforeMins*60000>Date.now()
      }
    )

    console.log('next',ind,JSON.stringify(plan.attacks));
    if(ind>-1){
      let mins=Math.ceil((plan.attacks[ind].launchDate-plan!.alertBeforeMins*60000-Date.now())/60000);
      setAlertIn(t('notification_time',{mins:mins}));
    }else{
      setAlertIn(null);
    }
  }

  function editPlanModal(){
    setModalState(true);
  }

  async function finishEdit(completed:boolean){
    if(plan!.armed && completed){
        await removeAlerts(plan!);
        await setUpAlerts(plan!);
    }
    setModalState(false);
  }


  function colorBytime(date:number,index:number){
    const now=new Date().getTime()
    date=date-plan!.alertBeforeMins*60000
    let classes=``;
    if(date<now) classes+=`item-color-past`;
    if(plan!.attacks[index-1]?.launchDate<now && date>now) classes+=` timeDivideTop timeDivide`;
    if(index==plan!.attacks.length-1 && date<now) classes+=` timeDivideBottom timeDivide`
    return classes
  }


  function formatDate(date:number){
    return new Intl.DateTimeFormat(i18n.language, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).format(date);
  }

  function toggleAlerts(on:boolean){
    if(on){
      setUpAlerts(plan!);
    }else{
      removeAlerts(plan!);
    }
  }

  async function removeAlerts(planIn:plan){
    let temp = structuredClone(planIn);
    temp.armed=false;
    temp.attacks.forEach((attack:attack)=>{

      attack.alertPending=false;
      attack.grouped=false;
    })

    for (const id of temp.alarmIds) {
      capacitorExactAlarm.cancelAlarm({ alarmId: id })
    }

    await StorageManager.editPlan(temp);
  }

  async function setUpAlerts(planIn:plan){
    let p = structuredClone(planIn)
    let futureAttacks:attack[] = p!.attacks.filter((attack:attack)=>{   
      return !attack.alertSent && attack.launchDate-(p!.alertBeforeMins*60000)>Date.now();
    })

    if(futureAttacks.length==0){
      presentToast(t('no_future_notifications'),'danger');
      return;
    }

    console.log(futureAttacks);

    let actualIndex=0
    let groups=[];
    let group=[futureAttacks[0]];

    if(futureAttacks.length==1){
      groups.push(group);
    }

    for (let i = 1; i < futureAttacks.length; i++) {
      if(futureAttacks[actualIndex].launchDate+(p!.combineMinutes*60000)>=futureAttacks[i].launchDate){
        group.push(futureAttacks[i]);
      }else{
        groups.push(group);
        actualIndex=i;
        group=[futureAttacks[i]];
      }
      if(i==futureAttacks.length-1){
        groups.push(group);
      }
    }
    
    let alarmIDs:any[]=[];
    for (const group of groups) {
      let firstAttack = group[0];
      let ids:number[] = []
      let body:string=t('send_command_body',{minute:plan?.alertBeforeMins})

      let origIndex = p.attacks.findIndex((att:attack)=>att.id==firstAttack.id);
      p.attacks[origIndex].alertPending=true;
      p.attacks[origIndex].grouped=false;

      group.forEach((attack,index)=>{
        if(index>0){
          p.attacks[origIndex+index].alertPending=true;
          p.attacks[origIndex+index].grouped=true;
        }
        ids.push(attack.id);
        body+=t('send_command_village',{village:attack.villageToName,attack_type:attack.isAttack ? t('attack'):t('support')})
      })

      const alarm = await capacitorExactAlarm.setAlarm({
        timestamp: new Date(firstAttack.launchDate-(p!.alertBeforeMins*60000)).getTime(),
        title: t('send_command',{n:group.length,date:formatDate(firstAttack.launchDate)}),
        msg: body,
        soundName:plan!.sound,
        data:{
          ids:ids,
          planId:planIn.id
        },
        icon: "ic_stat_swords",
      })
      alarmIDs.push(alarm.id);
    }

    p.armed=true;
    p.alarmIds=alarmIDs
    await StorageManager.editPlan(p);
    console.log('alarmIDs',JSON.stringify(alarmIDs));
    presentToast(`${t('notifications_scheduled',{cnt:alarmIDs.length})}`,'success');
  }

  function testNotification(){
    capacitorExactAlarm.setAlarm({
      timestamp: Date.now() + 1000*10,
      title: "Repeating Alarm",
      msg: "This alarm repeats every 15 minutes.",
      soundName:"",
      icon: "ic_stat_swords",
      data:{
          ids:[1,2],
          planId:1
      },
    });
  }

  function finishAlert(){
    setAlertState(false);
    dispatch(updateAlertIds(null))
  }

  function startPress(id:number){
    timerRef.current = setTimeout(() => {
      onLongPress(id);
    }, 1000);
  };

  function endPress(){
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  function onLongPress(id:number){
    dispatch(updateAlertIds([id]))
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color='primary'>
          <IonButtons slot="start">
            <IonBackButton text={t('back')}/>
          </IonButtons>
          <IonTitle onClick={testNotification}>{plan?.name} ({plan?.world})</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={editPlanModal}>
              <IonIcon icon={settingsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonGrid className='headercont'>
            <IonRow class='ion-text-center'>
                <IonCol>
                  <IonToggle checked={plan?.armed==true} onIonChange={(e)=>{toggleAlerts(e.detail.checked)}}>{t('enable_notifications')}</IonToggle>
                </IonCol>
            </IonRow>
            <IonRow class='ion-text-center'>
              {alertIn &&
                  <IonCol>{alertIn}</IonCol>
              }
            </IonRow>
        </IonGrid>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList className='scroller' inset={true}>
          <IonItemDivider>
            <IonLabel>{t('attacks')}:</IonLabel>
          </IonItemDivider>
          {plan?.attacks.length==0 &&
            <IonItem>
              <IonLabel>{t('no_items')}...</IonLabel>
            </IonItem>
          }
          {plan?.attacks.map((attack:attack,index:number)=>{
            return(
            <IonItem 
              button
              onPointerDown={()=>{startPress(attack.id)}}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              className={colorBytime(attack.launchDate,index)} 
              key={index}
            >
              <img height={20} width={20} src={`/${attack.isAttack? "attack":"support"}.png`} slot="start"/>
              <IonLabel>
                <h2><b>#{attack.id}</b> <img src={'/unit_'+attack.unitSpeed+'.png'} /> {formatDate(attack.launchDate)}</h2>
                <p><b>{t('village')}: <a style={{color:'#603000'}}>{attack.villageToName}</a></b></p>
                <p><b>{t('alert')}:</b> ({formatDate(attack.launchDate-plan.alertBeforeMins*60000)})</p>

              </IonLabel>
              {attack.alertPending &&
                <>{attack.grouped?
                  <IonIcon src='./chained.svg'/>
                  :
                  <IonIcon icon={notificationsOutline}/>
                }</>
              }
              {attack.alertSent &&
                <IonIcon icon={checkmarkDoneCircleOutline}/>
              }
              
            </IonItem>
          )})
            
          }
        </IonList>
      </IonContent>
      {alertIds && alertState &&  <AlertModal plan={plan} ids={alertIds} finishHandler={finishAlert} open={alertState}/> }
      {plan && <PlanModal planIn={plan} finishHandler={finishEdit} isOpen={modalState}/>}
    </IonPage>
  );
};

export default Plan;
