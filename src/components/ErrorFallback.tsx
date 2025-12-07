import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton
} from '@ionic/react';

interface Props {
  error: Error;
}

function reset(){
    window.location.reload();
}

const ErrorFallback: React.FC<Props> = ({ error }) => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="danger">
          <IonTitle>App Error</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h2>Something broke 😱</h2>

        <p><strong>{error.message}</strong></p>

        <pre
          style={{
            whiteSpace: 'pre-wrap',
            background: '#222',
            color: '#eee',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '12px',
            maxHeight: '40vh',
            overflowY: 'auto'
          }}
        >
          {error.stack}
        </pre>

        <IonButton onClick={reset}>Try Again</IonButton>
      </IonContent>
    </IonPage>
  );
};

export default ErrorFallback;
