import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { monadTestnet } from "./monad";

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
  ssr: true,
});
