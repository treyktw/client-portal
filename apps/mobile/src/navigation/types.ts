// mobile/src/navigation/types.ts
import type { StackScreenProps } from '@react-navigation/stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  WorkspaceSelect: undefined;
  Onboarding: { workspaceId: string };
};

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Notes: undefined;
  Tasks: undefined;
  Messages: undefined;
  Files: undefined;
};

export type NotesStackParamList = {
  NotesList: undefined;
  NoteEditor: { noteId?: string };
};

export type MessagesStackParamList = {
  ThreadsList: undefined;
  Chat: { threadId: string };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  StackScreenProps<RootStackParamList, T>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  CompositeScreenProps<
    StackScreenProps<AuthStackParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;