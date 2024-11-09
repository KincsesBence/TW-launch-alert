import { attack, plan } from "../pages/Home";
import { Preferences } from '@capacitor/preferences';

export default class StorageManager {
    private static data:plan[]=[];
    static isLoaded=false;

    static async init(){
        if(StorageManager.isLoaded) return;
        const ret = await Preferences.get({key: 'appData'});
        StorageManager.isLoaded=true;
        if(ret.value==null){
            StorageManager.data=[];
            return;
        };
        StorageManager.data = JSON.parse(ret.value!);
    }

    static async save(){
        if(!StorageManager.isLoaded) return;
        try {
            await Preferences.set({
                key: 'appData',
                value: JSON.stringify(StorageManager.data)
            })
        } catch (error) {
            console.error('error save:',error);
        }
        
    }

    static async getNewPlanId():Promise<number>{
        await StorageManager.init()
        return StorageManager.data.length+1;
    }

    static async getPlan(planIn:number):Promise<plan | null>{
        await StorageManager.init()
        let indp = StorageManager.data.findIndex((plan:plan) => plan.id==planIn);
        if(indp==-1) return null;
        return StorageManager.data[indp];
    }

    static async getPlans():Promise<plan[]>{
        await StorageManager.init()
        return StorageManager.data;
    }

    static async createPlan(planIn:plan):Promise<number>{
        await StorageManager.init()
        StorageManager.data.push(planIn)
        StorageManager.save()
        return StorageManager.data.length-1;
    }

    static async editPlan(planIn:plan):Promise<number>{
        await StorageManager.init()
        let indp = StorageManager.data.findIndex((plan:plan) => plan.id==planIn.id);
        if(indp==-1) return indp;
        StorageManager.data[indp]=planIn;
        StorageManager.save()
        return indp;
    }

    static async removePlan(planId:number):Promise<number>{
        await StorageManager.init()
        let indp = StorageManager.data.findIndex((plan:plan) => plan.id==planId);
        if(indp==-1) return indp;
        StorageManager.data.splice(indp,1);
        StorageManager.save()
        return indp;
    }

    static async getAttack(planId:number,attackId:number):Promise<null | attack>{
        await StorageManager.init();
        let indp = StorageManager.data.findIndex((plan:plan) => plan.id==planId);
        if(indp==-1) return null;
        let inda = StorageManager.data[indp].attacks.findIndex((attack:attack) => attack.id==attackId);
        if(inda==-1) return null;
        return StorageManager.data[indp].attacks[inda];
    }

    static async getAttacks(planId:number):Promise<null | attack[]>{
        await StorageManager.init()
        let indp = StorageManager.data.findIndex((plan:plan) => plan.id==planId);
        if(indp==-1) return null;
        return StorageManager.data[indp].attacks;
    }

    static async createAttacks(planId:number,attacks:attack[]):Promise<number>{
        await StorageManager.init()
        let indp = StorageManager.data.findIndex((plan:plan) => plan.id==planId);
        if(indp==-1) return indp;
        StorageManager.data[indp].attacks.concat(attacks)
        StorageManager.save()
        return indp
    }

    static async editAttack(planId:number,attackId:number,attack:attack):Promise<number>{
        await StorageManager.init()
        let indp = StorageManager.data.findIndex((plan:plan) => plan.id==planId);
        if(indp==-1) return indp;
        let inda = StorageManager.data[indp].attacks.findIndex((attack:attack) => attack.id==attackId);
        if(inda==-1) return inda;
        StorageManager.data[indp].attacks[inda]=attack;
        StorageManager.save()
        return inda;
    }

    static async removeAttack(planId:number,attackId:number):Promise<number>{
        await StorageManager.init()
        let indp = StorageManager.data.findIndex((plan:plan) => plan.id==planId);
        if(indp==-1) return indp;
        let inda = StorageManager.data[indp].attacks.findIndex((attack:attack) => attack.id==attackId);
        if(inda==-1) return inda;
        StorageManager.data[indp].attacks.splice(inda,1);
        StorageManager.save()
        return inda;
    }
}