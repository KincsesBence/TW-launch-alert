import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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
  sound:string,
  maxPage:number,
  loadedPages:number[],
  domain:string,
  world:string
  combineMinutes:number,
  alertBeforeMins:number,
  armed:Boolean,
  attacks:attack[],
  alarmIds:number[]
}


interface appState {
  plans: plan[];
  alertIds: number[] | null 
}

const initialState: appState = {
  plans: [],
  alertIds:null
};

export const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    loadPlans: (state,action:PayloadAction<plan[]>) => {
      state.plans = action.payload
    },
    updateAlertIds : (state,action:PayloadAction<number[] | null>) => {
      state.alertIds = action.payload
    },
  },
});

export const { loadPlans,updateAlertIds } = appSlice.actions;

export default appSlice.reducer;
