import { Redirect, Route, useHistory } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact, useIonRouter } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';
import Plan from './pages/Plan';
import { ActionPerformed, Channel, LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { App as capApp } from '@capacitor/app';
import { useContext, useState } from 'react';


setupIonicReact();

export const channels:Channel[]=[
  {
    id:'scream',
    name:'Scream',
    importance: 5,
    sound: 'scream.mp3',
    visibility: 1,
    vibration: true,
  },
  {
    id:'brotherhood',
    name:'Brotherhood',
    importance: 5,
    sound: 'brotherhood.mp3',
    visibility: 1,
    vibration: true,
  } 
]


let OpenedID=-1;
let IsSleeping=false;
const App:React.FC = () => {
  const [alertIds,setAlertIds] = useState<number[]>([]);
  const [planID,setPlanID] = useState<number | null>(null);


  LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction: ActionPerformed)=>{
    console.log('localNotificationActionPerformed');
    
    if(OpenedID!=notificationAction.notification.id){
      console.log('localNotificationActionPerformed',JSON.stringify(notificationAction));
      OpenedID=notificationAction.notification.id;
      setAlertIds([...notificationAction.notification.extra.ids]);
      setPlanID(notificationAction.notification.extra.planId)
    }
  })

  LocalNotifications.addListener('localNotificationReceived', (notification: LocalNotificationSchema)=>{
    console.log('localNotificationReceived');

    if(!IsSleeping && OpenedID!=notification.id){
      OpenedID=notification.id;
      console.log('localNotificationReceived',JSON.stringify(notification));
      setAlertIds([...notification.extra.ids]);
      setPlanID(notification.extra.planId)
    }
  })

  capApp.addListener('appStateChange', ({ isActive }) => {
    if(IsSleeping && isActive){
      IsSleeping=false;
    }else if(!isActive && !IsSleeping){
      IsSleeping=true;
    }
  });

  function cleartNofication(){
    LocalNotifications.removeAllDeliveredNotifications()
    OpenedID=-1;
    setPlanID(null);
    setAlertIds([]);
  }

  return(
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/home">
        </Route>
        <Route exact path="/home" render={(props) => (
            <Home planId={planID} alertIds={alertIds}/>
        )} />
        <Route exact path="/">
          <Redirect to="/home" />
        </Route>
        <Route exact path="/plan/:id" render={(props) => (
            <Plan alertCleared={cleartNofication} alertIds={alertIds} id={props.match.params.id}/>
        )} />
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>)
}

export default App;
