import { IonAvatar, IonBackButton, IonButton, IonButtons, IonCol, IonContent, IonFab, IonFabButton, IonGrid, IonHeader, IonIcon, IonItem, IonItemDivider, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonPage, IonRow, IonTitle, IonToggle, IonToolbar, useIonToast } from '@ionic/react';
import './Home.css';
import StorageManager  from '../components/storageManager'
import { RouteComponentProps, useHistory, useParams } from 'react-router';
import { useContext, useEffect, useRef, useState } from 'react';
import { attack, plan } from './Home';
import { ActionPerformed, LocalNotificationDescriptor, LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { checkmarkDoneCircleOutline, flash, notifications, notificationsOutline, settingsOutline, time } from 'ionicons/icons';
import { App } from '@capacitor/app';
import editPlanModal from '../components/editPlanModal';
import EditPlanModal from '../components/editPlanModal';
import AlertModal from '../components/alertModal';
import { useTranslation } from 'react-i18next';

interface worldProps{
  alertIds:number[],
  id:string,
  alertCleared:() => void
}
    
type editPlanModalHandler = React.ElementRef<typeof editPlanModal>;
type alertModalHandler = React.ElementRef<typeof AlertModal>;
let IsSleeping:boolean=false;
let OpenedID=-1;

const Plan: React.FC<worldProps> = (props) => {
  const { t, i18n } = useTranslation();
  const modalRef = useRef<editPlanModalHandler>(null);
  const alertModalRef = useRef<alertModalHandler>(null);
  const [plan,setPlan] = useState<plan | null>(null);
  const [ids,setIds] = useState<number[]>([]);
  const [alertIn,setAlertIn] = useState<string>('');
  const [present] = useIonToast();
  const history = useHistory();

  useEffect(()=>{
    loadPlan(parseInt(props.id));
    let inter = setInterval(()=>{
      loadPlan(parseInt(props.id));
    },15000);

    return () => {
      clearInterval(inter);
  	};
  },[])

  useEffect(()=>{
    console.log(props.alertIds);
    
    if(props.alertIds.length>0){
      setIds([...props.alertIds]);
      alertModalRef.current?.setState(true);
    }
  },[props.alertIds])

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
      loadPlan(parseInt(props.id));
    }else if(!isActive && !IsSleeping){
      IsSleeping=true;
    }
  });

  function getNextAlert(){
    if(!plan!.armed){
      setAlertIn(``);
      return
    }
    let ind = plan!.attacks.findIndex((attack)=>{return attack.alertPending && !attack.grouped && attack.launchDate-plan!.alertBeforeMins*60000>Date.now()})
    console.log('next',ind);
    if(ind>-1){
      let mins=Math.ceil((plan!.attacks[ind].launchDate-plan!.alertBeforeMins*60000-Date.now())/60000);
        setAlertIn(t('notification_time',{mins:mins}));
    }else{
      setAlertIn(``);
    }
  }


  useEffect(()=>{
    if(plan!=null){
      /*console.log('navigate');
      const section = document.querySelector( '.timeDivide' );
      if(!section) return
      setTimeout(()=>{
        section.scrollIntoView( { behavior: 'smooth', block: 'start' } );
      },500)*/
       
      getNextAlert();
    }
  },[plan])

  function editPlanModal(){
    modalRef.current?.setState(true);
  }

  function finishAlert(){
    console.log('finished-alert');
    props.alertCleared();
    loadPlan(plan!.id);
  }

  async function finishEdit(){
    if(plan!.armed){
        await removeAlerts(plan!);
        await setUpAlerts(plan!);
    }
    setPlan({...plan!});
  }


  async function loadPlan(id:number){
    let res = await StorageManager.getPlan(id);    
    if(res==null) {
      history.push('/');
      return;
    };
    
    setPlan({...res});
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
    let notificationsRemove:LocalNotificationDescriptor[] = [];

    let temp={...planIn!};
    temp.armed=false;
    temp.attacks.forEach((attack)=>{
      if(attack.alertPending && !attack.grouped){
        notificationsRemove.push({id:parseInt(`${plan!.id}${attack.id}`)})
      }
      attack.alertPending=false;
      attack.grouped=false;
    })

    await LocalNotifications.cancel({
      notifications:notificationsRemove
    })
    await StorageManager.editPlan(temp);
    loadPlan(temp.id);
  }

  async function setUpAlerts(planIn:plan){
    let temp={...planIn!};
    let notifications:LocalNotificationSchema[]=[];
    let futureAttacks:attack[] = temp!.attacks.filter((attack:attack)=>{      
      return attack.launchDate-(temp!.alertBeforeMins*60000)>Date.now();
    })

    if(futureAttacks.length==0){
      presentToast(t('no_future_notifications'),'danger');
      return;
    }

    console.log(futureAttacks);

    let actualIndex=0
    let groups=[];
    let group=[0];

    if(futureAttacks.length==1){
      groups.push(group);
    }

    for (let i = 1; i < futureAttacks.length; i++) {
      if(futureAttacks[actualIndex].launchDate+(temp!.combineMinutes*60000)>=futureAttacks[i].launchDate){
        group.push(i);
      }else{
        groups.push(group);
        actualIndex=i;
        group=[i];
      }
      if(i==futureAttacks.length-1){
        groups.push(group);
      }
    }


    groups.forEach((group)=>{
      let attack = futureAttacks[group[0]];
      let ids:number[] = []
      let body:string=t('send_command_body',{minute:plan?.alertBeforeMins})
      group.forEach((item)=>{
        ids.push(futureAttacks[item].id-1);
        body+=t('send_command_village',{village:attack.villageToName,attack_type:attack.isAttack ? t('attack'):t('support')})
      })

      notifications.push(
        {
          title: t('send_command',{n:group.length,date:formatDate(attack.launchDate)}),
          body:body,
          id:parseInt(`${temp!.id}${attack.id}`),
          schedule:{at:new Date(attack.launchDate-(temp!.alertBeforeMins*60000))},
          channelId:temp.channelId,
          extra:{
            ids:ids,
            planId:planIn.id
          },
          smallIcon: "ic_stat_swords",
          iconColor: "#d9b97c",
        }
      )


      let origIndex = temp.attacks.findIndex((att)=>att.id==attack.id);
      temp.attacks[origIndex].alertPending=true;
      temp.attacks[origIndex].grouped=false;
      for (let i = 1; i < group.length; i++) {
        temp.attacks[origIndex+i].alertPending=true;
        temp.attacks[origIndex+i].grouped=true;
      }
    })

    await LocalNotifications.schedule({
      notifications:notifications
    })

    let res = await LocalNotifications.getPending();

    console.log('pending cnt:',res.notifications.length);
    

    temp.armed=true;
    await StorageManager.editPlan(temp);
    loadPlan(temp.id);
  }

  function testNotification(){
    OpenedID=-1;
    LocalNotifications.schedule({notifications:[
      {
        title:`Teszt alert`,
        body:`Teszt alert kell indítani\n új sor`,
        id:11,
        schedule:{at:new Date(Date.now()+3000)},
        channelId:plan!.channelId,
        extra:{
          ids:[1,2],
          planId:1
        },
        smallIcon: "ic_stat_swords",
        iconColor: "#d9b97c",
      }
    ]})
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
              {alertIn!='' &&
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
          {plan?.attacks.map((attack:attack,index)=>{
            return(
            <IonItem className={colorBytime(attack.launchDate,index)} key={index}>
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
      <AlertModal plan={plan} ids={ids}  finishHandler={finishAlert} ref={alertModalRef}/>
      <EditPlanModal plan={plan} finishHandler={finishEdit} ref={modalRef}/>
    </IonPage>
  );
};

export default Plan;
