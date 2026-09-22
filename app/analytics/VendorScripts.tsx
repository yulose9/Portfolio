import Script from "next/script";

/*
 * Third-party analytics, recovered from the pre-redesign layout.
 *
 * Every snippet is verbatim from commit d1f6af7. The IDs and tokens below are
 * live, so they are worth confirming against each vendor's dashboard before
 * trusting any numbers they produce.
 *
 * All of them load with strategy="lazyOnload", which holds them until after
 * the page is interactive. That is deliberate: six vendors is a lot of
 * third-party JavaScript for a static portfolio, and none of it needs to run
 * before the page is usable.
 *
 * PostHog is not here. It initialises separately, through
 * instrumentation-client.ts and the deferred chain under app/providers/.
 */

const CLARITY = `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "uehtex8zqz");
            `;

const MIXPANEL = `
              (function(e,c){if(!c.__SV){var l,h;window.mixpanel=c;c._i=[];c.init=function(q,r,f){function t(d,a){var g=a.split(".");2==g.length&&(d=d[g[0]],a=g[1]);d[a]=function(){d.push([a].concat(Array.prototype.slice.call(arguments,0)))}}var b=c;"undefined"!==typeof f?b=c[f]=[]:f="mixpanel";b.people=b.people||[];b.toString=function(d){var a="mixpanel";"mixpanel"!==f&&(a+="."+f);d||(a+=" (stub)");return a};b.people.toString=function(){return b.toString(1)+".people (stub)"};l="disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders start_session_recording stop_session_recording people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");
              for(h=0;h<l.length;h++)t(b,l[h]);var n="set set_once union unset remove delete".split(" ");b.get_group=function(){function d(p){a[p]=function(){b.push([g,[p].concat(Array.prototype.slice.call(arguments,0))])}}for(var a={},g=["get_group"].concat(Array.prototype.slice.call(arguments,0)),m=0;m<n.length;m++)d(n[m]);return a};c._i.push([q,r,f])};c.__SV=1.2;var k=e.createElement("script");k.type="text/javascript";k.async=!0;k.src="undefined"!==typeof MIXPANEL_CUSTOM_LIB_URL?MIXPANEL_CUSTOM_LIB_URL:"file:"===e.location.protocol&&"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\\/\\//)?"https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js":"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";e=e.getElementsByTagName("script")[0];e.parentNode.insertBefore(k,e)}})(document,window.mixpanel||[])

              mixpanel.init('a67416976e3c5fbd3849ab1edcf3ff5b', {
                debug: false,
                track_pageview: true,
                persistence: 'localStorage',
                record_sessions_percent: 0,
                record_mask_text_selector: ".mask-text",
                record_block_selector: ".block-recording"
              })
            `;

const GTAG = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-8SLDNR1QTT');
          `;

export default function VendorScripts() {
  return (
    <>
      {/* Microsoft Clarity — session replay and heatmaps */}
      <Script
        id="microsoft-clarity"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{ __html: CLARITY }}
      />

      {/* Cloudflare Web Analytics */}
      <Script
        strategy="lazyOnload"
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token": "e48b484435ef4fb0a307689022769282"}'
      />

      {/* Umami */}
      <Script
        src="https://cloud.umami.is/script.js"
        data-website-id="a0d016ea-6eb5-4de4-b15f-31c99d2d810f"
        strategy="lazyOnload"
      />

      {/* Mixpanel */}
      <Script
        id="mixpanel-init"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{ __html: MIXPANEL }}
      />

      {/* Google Analytics 4 */}
      <Script
        strategy="lazyOnload"
        src="https://www.googletagmanager.com/gtag/js?id=G-8SLDNR1QTT"
      />
      <Script
        id="google-analytics"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{ __html: GTAG }}
      />
    </>
  );
}
