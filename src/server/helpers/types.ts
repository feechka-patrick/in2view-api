export type BonusType = keyof LoyaltyBonuses;

export type LoyaltyBonusType = {
  name: string;
  amount: number;
  oneTime: boolean;
};

export type LoyaltyBonusesKey =
  | 'signUpBonus'
  | 'completeProfileBonus'
  | 'subscribeTelegramBonus'
  | 'friendCompleteProfileBonus'
  | 'custdevCheckoutBonus'
  | 'custdevPassedBonus'
  | 'custdevMissedFine'
  | 'custdevRatedBonus'
  | 'socialProfileBonus'
  | 'socialShareBonus'
  | 'timeToTimeQuestionBonus';

export type LoyaltyBonuses = Record<LoyaltyBonusesKey, LoyaltyBonusType>;

export interface NotificationItem {
  uid: string;
  date: string;
  read: boolean;
  message: string;
  link?: string;
}

export interface EditableProfile {
  email?: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  status?: string;
  telegram?: string;
  facebook?: string;
  instagram?: string;
  position?: string;
  company?: CompanyInfo;
}

export interface ProfileForm {
  questions: [];
}

interface Account {
  bonuses: number;
  score: number;
  blocked: boolean;
  bonusesLastUpdatedAt: string | null;
  custdevLastCreatedAt: string | null;
  loyaltyProgress?: {
    [B in BonusType]?: boolean | string[];
  };
}

interface Subscription {
  paymentMethod: any;
  subscriptionPlanUid: string;
  availableCustdevs: number;
  respondentsPerCustdev: number;
  payment: Payment | null;
  expiresAt: string | null;
}

interface Payment {
  invoiceId: number;
  amount: number;
  // other payment info
}

export interface StoredUser extends EditableProfile {
  uid: string;
  createdAt: string;
  role: Role;
  subscription: Subscription;
  refId?: string;
  profileForm?: ProfileForm;
  account: Account;
  gifts?: Record<string, string>;
  notifications?: NotificationItem[];
  timeQuestions?: [];
}

type Role = 'admin' | 'respondent' | 'client' | 'unset';

export interface CustomClaims {
  role: Role;
}

export interface CompanyInfo {
  name?: string;
  logoUrl?: string;
}

export interface AvailabilityDayData {
  title: string;
  dayOfWeek: number;
  start: string;
  end: string;
}

export type CustdevRespondentApplicationStatus =
  | 'failed'
  // отправлено организатору
  | 'waitingOrganizator'
  // предложено перенести
  | 'waitingRespondent'
  // время согласовано
  | 'scheduled'
  // отменено
  | 'cancelled'
  // полностью завершено
  | 'completed';

export interface CustdevRespondentApplication {
  date?: string;
  comments?: string;
  status?: CustdevRespondentApplicationStatus;
  rating?: boolean;
  clientFeedback?: string;
  respondentFeedback?: string;
}

export type CustdevRespondent = Record<string, CustdevRespondentApplication>;

export interface CustdevItem {
  uid: string;
  title: string;
  duration: {
    hours: number;
    minutes: number;
  };
  description: string;
  meetingLink: string;
  availability: AvailabilityDayData[];
  respondents?: CustdevRespondent;
  userId?: string;
  companyInfo?: CompanyInfo;
  questions: {
    uid: string;
    answers: string[];
    blocker: boolean;
  }[];
  createdAt: string;
  archived: boolean;
  finished: boolean;
  // matches
  // dates
  // etc
}

export type MatchedItem = {
  matchRate: number;
};

export type ProfileItem = Pick<
  StoredUser,
  'displayName' | 'photoURL' | 'profileForm' | 'status' | 'uid'
>;

export type MatchedProfileItem = ProfileItem & MatchedItem;
