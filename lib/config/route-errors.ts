export interface RouteErrorConfig {
  match: string | RegExp;
  titleKey: string;
  defaultTitle: string;
  descriptionKey: string;
  defaultDescription: string;
}

export const ROUTE_ERROR_MESSAGES: RouteErrorConfig[] = [
  {
    match: '/dashboard',
    titleKey: 'routeError.dashboard.title',
    defaultTitle: 'Dashboard unavailable',
    descriptionKey: 'routeError.dashboard.description',
    defaultDescription: 'We could not load your dashboard summary. Please check your connection and try again.',
  },
  {
    match: '/send',
    titleKey: 'routeError.send.title',
    defaultTitle: 'Transfer unavailable',
    descriptionKey: 'routeError.send.description',
    defaultDescription: 'There was a problem loading the transfer flow. Your previous progress has been saved.',
  },
  {
    match: '/transactions',
    titleKey: 'routeError.transactions.title',
    defaultTitle: 'Transactions unavailable',
    descriptionKey: 'routeError.transactions.description',
    defaultDescription: 'We could not load your transaction history. Please try again in a moment.',
  },
  {
    match: '/bills',
    titleKey: 'routeError.bills.title',
    defaultTitle: 'Bills unavailable',
    descriptionKey: 'routeError.bills.description',
    defaultDescription: 'We could not load your bill payments at this time.',
  },
  {
    match: '/settings',
    titleKey: 'routeError.settings.title',
    defaultTitle: 'Settings unavailable',
    descriptionKey: 'routeError.settings.description',
    defaultDescription: 'We could not load your preferences. Please try again later.',
  }
];

export const DEFAULT_ERROR_MESSAGE = {
  titleKey: 'rootError.title',
  defaultTitle: 'Something went wrong',
  descriptionKey: 'rootError.description',
  defaultDescription: 'We hit an unexpected problem, but your session is still safe. Try reloading this view or return home.',
};
