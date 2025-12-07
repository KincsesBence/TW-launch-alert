import { Redirect, Route, useHistory } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact, useIonRouter } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import ErrorFallback from './components/ErrorFallback';
import { ErrorBoundary } from 'react-error-boundary';

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
/*import '@ionic/react/css/palettes/dark.system.css';*/

/* Theme variables */
import './theme/variables.css';
import Plan from './pages/Plan';
import { StatusBar } from '@capacitor/status-bar';
import { App as capApp } from '@capacitor/app';
import { useContext, useEffect, useState } from 'react';
import { Alarm, capacitorExactAlarm } from 'capacitor-exact-alarm';
import { useDispatch } from 'react-redux';
import { loadPlans, updateAlertIds } from './store/appSlice';
import StorageManager from './components/storageManager';
import { SplashScreen } from '@capacitor/splash-screen';
import { useSelector } from 'react-redux';
import { RootState } from './store/store';

StatusBar.setOverlaysWebView({ overlay: false }); // Prevent status bar from overlaying

setupIonicReact();

const App:React.FC = () => {
  const router = useIonRouter();
  const [alertIds,setAlertIds] = useState<number[]>([]);
  const [planID,setPlanID] = useState<number | null>(null);
  const plans = useSelector((state:RootState) => state.app.plans);
  const dispatch = useDispatch();

  useEffect(() => {
    setupListeners();
    document.body.classList.remove('dark');
    initPlans()
  }, []);
  
  async function initPlans(){
    await StorageManager.getPlans();
    await SplashScreen.hide();
    requestPermissions();
  }

  async function requestPermissions() {
    await capacitorExactAlarm.requestExactAlarmPermission();
    await capacitorExactAlarm.requestNotificationPermission();
  }

  function setupListeners(){
    capacitorExactAlarm.addListener('alarmNotificationTapped',(alarm:Alarm)=>{
      console.log('alarmNotificationTapped',JSON.stringify(alarm));
      if(alarm.data.ids && alarm.data.planId){
        setPlanID(alarm.data.planId);
        dispatch(updateAlertIds([...alarm.data.ids]))
      }
      capacitorExactAlarm.stopAlarm();
    })

    capacitorExactAlarm.addListener("alarmTriggered",(alarm:Alarm)=>{
      console.log('alarmTriggered',JSON.stringify(alarm));
      if(alarm.data.ids && alarm.data.planId){
        setPlanID(alarm.data.planId);
        dispatch(updateAlertIds([...alarm.data.ids]))
      }
    });
  }

  return(
  <IonApp>
    <IonReactRouter>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <IonRouterOutlet>
          <Route exact path="/home">
          </Route>
          <Route exact path="/home" render={(props) => (
              <Home planId={planID}/>
          )} />
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
          <Route exact path="/plan/:id" render={(props) => (
              <Plan openPlan={props.match.params.id}/>
          )} />
        </IonRouterOutlet>
      </ErrorBoundary>
    </IonReactRouter>
  </IonApp>)
}

export default App;
