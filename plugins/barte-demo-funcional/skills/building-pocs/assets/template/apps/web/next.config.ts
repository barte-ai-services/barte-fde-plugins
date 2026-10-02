import type { NextConfig } from "next";

const config: NextConfig = {
  /**
   * Without this the demo opens grey and does NOT hydrate.
   *
   * Next 16 serves its development resources only to the origin it considers its
   * own (`localhost`) and refuses the rest — including `127.0.0.1`, which is the
   * address the script publishes and the browser opens. The block kills HMR and
   * the chunks that hydrate the page: the screen RENDERS (the HTML comes from the
   * server) and then sits inert, calling no API and answering no click. Nothing
   * shows up in the browser console — the message lands in the `next dev` log,
   * which is the last place anyone looks once the screen has appeared.
   *
   * Development only; `next build` ignores this field.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  /**
   * The Next badge in the bottom-left corner sits exactly on top of the client
   * block in the sidebar — and in a proposal demo that is the framework's brand
   * covering the client's. It goes; `next dev` is otherwise unchanged.
   */
  devIndicators: false,
};

export default config;
