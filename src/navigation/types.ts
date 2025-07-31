export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  GroupSelection: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  CreateGroup: undefined;
  JoinGroup: undefined;
  ProfileSetup: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  AddDrink: undefined;
  History: undefined;
  Group: undefined;
  Lineup: undefined;
  Stats: undefined;
  MemberProfile: { memberId: string };
  LineupManage: undefined;
  Mapping: undefined;
  NotificationSettings: undefined;
  ChangeGroup: undefined;
};

export type BottomTabParamList = {
  Dashboard: undefined;
  History: undefined;
  Chat: undefined;
  Lineup: undefined;
  Group: undefined;
  Stats: undefined;
  Map: undefined;
  Settings: undefined;
};