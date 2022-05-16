
interface SubInfo {
  subscriptionPlanUid: string,
  subscriptionAmount: number,
  availableCustdevs: number,
  respondentsPerCustdev: number,
}
export const subscriptionPlan: Record<string, SubInfo> = {
    'trial': {
      subscriptionPlanUid: 'trial',
      subscriptionAmount: 0,
      availableCustdevs: 1,
      respondentsPerCustdev: 2,
    },
    'one-time': {
      subscriptionPlanUid: 'one-time',
      subscriptionAmount: 3500,
      availableCustdevs: 1,
      respondentsPerCustdev: 15,
    },
    'startup': {
      subscriptionPlanUid: 'startup',
      subscriptionAmount: 5000,
      availableCustdevs: 2,
      respondentsPerCustdev: 7,
    },
    'agency': {
      subscriptionPlanUid: 'agency',
      subscriptionAmount: 15000,
      availableCustdevs: 4,
      respondentsPerCustdev: 15,
    },
    'custom': {
      subscriptionPlanUid: 'custom',
      subscriptionAmount: 1,
      availableCustdevs: 1,
      respondentsPerCustdev: 1,
    },
    'none': {
      subscriptionPlanUid: 'none',
      subscriptionAmount: 0,
      availableCustdevs: 0,
      respondentsPerCustdev: 0,
    }
};

// export default subscriptionPlan;