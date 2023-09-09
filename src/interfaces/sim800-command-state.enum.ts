export enum Sim800CommandState {
  Created = 'Created',
  Transmitting = 'Transmitting',
  Acknowledged = 'Acknowledged',
  Done = 'Done',
  Error = 'Error',
}

export enum NetworkStatus {
  NotRegistered = '0',
  RegisteredHomeNetwork = '1',
  NotRegisteredSearching = '2',
  RegistrationDenied = '3',
  Unknown = '4',
  RegisteredRoaming = '5',
}
