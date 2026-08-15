/** Minimal navigation surface consumed by the shared Expo Router headers. */
export type HeaderNavigation = {
  goBack: () => void;
  dispatch: (action: { type: string }) => void;
};
