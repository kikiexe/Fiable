import type { PrivyClientConfig } from "@privy-io/react-auth";
import { monadTestnet } from "./monad";

export const PRIVY_APP_ID =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID &&
  process.env.NEXT_PUBLIC_PRIVY_APP_ID.trim().length > 0
    ? process.env.NEXT_PUBLIC_PRIVY_APP_ID
    : "cmtw01df801zb0ckzb3rhrlrw";

export const privyConfig: PrivyClientConfig = {
  defaultChain: monadTestnet,
  supportedChains: [monadTestnet],
  walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
  appearance: {
    theme: "dark",
    accentColor: "#2563EB",
    showWalletLoginFirst: true,
    walletChainType: "ethereum-only",
  },
  loginMethods: ["wallet", "email", "google"],
};
