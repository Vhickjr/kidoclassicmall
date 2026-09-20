import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { storeSettings } from "@/lib/settings-store";
import { MailCheck } from "lucide-react";
import { emailStatus, verifyEmailConnection } from "@/lib/mail";
import {
  saveFooterLinks,
  saveStoreSettings,
  saveValueProps,
  sendTestEmailAction,
} from "@/app/_actions/admin";
import { footerLinks, valueProps } from "@/lib/site-content";
import { VALUE_PROP_ICONS } from "@/app/_components/value-props";
import ImageUploader from "@/app/_components/image-uploader";

export const metadata: Metadata = { title: "Store settings" };

const naira = (kobo: number) => (kobo / 100).toFixed(2);

export default async function AdminSettingsPage() {
  if (!(await requireAdmin())) return null;

  const [settings, props, columns, connection] = await Promise.all([
    storeSettings(),
    valueProps(),
    footerLinks(),
    // Actually opens a connection, so this reports what the live server can
    // really do rather than just whether the variables look filled in.
    verifyEmailConnection(),
  ]);

  const email = emailStatus();

  // Four slots always render, so an empty one is how you add a promise.
  const slots = [...props, ...Array(4).fill(null)].slice(0, 4);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Store settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Delivery is priced from these figures at checkout, and the same values
        are written onto the order, so what a customer is shown is what they are
        charged.
      </p>

      <form action={saveStoreSettings} className="mt-8 max-w-md">
        <label className="block">
          <span className="text-xs text-muted">Delivery charge (&#8358;)</span>
          <input
            name="deliveryFlat"
            defaultValue={naira(settings.deliveryFlatKobo)}
            required
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-xs text-muted">
            Free delivery on orders above (&#8358;)
          </span>
          <input
            name="freeDeliveryOver"
            defaultValue={naira(settings.freeDeliveryOverKobo)}
            required
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <p className="mt-2 text-xs text-muted">
          Set the threshold very high to switch free delivery off entirely.
        </p>

        {/* ---- Hero ---- */}
        <h2 className="mt-12 text-lg font-semibold">Homepage hero</h2>
        <p className="mt-1 text-sm text-muted">
          The hero is two equal halves side by side, each with its own
          background picture. The words sit over the left half. Leave a picture
          empty and that half falls back to the brand colours.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <span className="text-xs text-muted">Left background</span>
            <div className="mt-1.5">
              <ImageUploader
                name="heroLeftImage"
                multiple={false}
                initial={settings.hero.leftImage ? [settings.hero.leftImage] : []}
              />
            </div>
          </div>

          <div>
            <span className="text-xs text-muted">Right background</span>
            <div className="mt-1.5">
              <ImageUploader
                name="heroRightImage"
                multiple={false}
                initial={
                  settings.hero.rightImage ? [settings.hero.rightImage] : []
                }
              />
            </div>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="text-xs text-muted">Small heading above the title</span>
          <input
            name="heroEyebrow"
            defaultValue={settings.hero.eyebrow}
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-xs text-muted">Title</span>
          <input
            name="heroTitle"
            defaultValue={settings.hero.title}
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-xs text-muted">Subtitle</span>
          <input
            name="heroSubtitle"
            defaultValue={settings.hero.subtitle}
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <div className="mt-5 flex flex-wrap gap-4">
          <label className="block flex-1">
            <span className="text-xs text-muted">Button label</span>
            <input
              name="heroCtaLabel"
              defaultValue={settings.hero.ctaLabel}
              className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </label>

          <label className="block flex-1">
            <span className="text-xs text-muted">Button link</span>
            <input
              name="heroCtaHref"
              defaultValue={settings.hero.ctaHref}
              className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </label>
        </div>

        {/* ---- WhatsApp ---- */}
        <h2 className="mt-12 text-lg font-semibold">WhatsApp chat button</h2>
        <p className="mt-1 text-sm text-muted">
          A floating chat button on every storefront page. Nothing appears on
          the site until this is switched on and a number is saved.
        </p>

        <label className="mt-5 flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="whatsappEnabled"
            defaultChecked={settings.whatsapp.enabled}
            className="size-4 accent-brand"
          />
          Show the WhatsApp button on the website
        </label>

        <label className="mt-5 block">
          <span className="text-xs text-muted">
            WhatsApp number, with country code (e.g. 234 816 363 1011)
          </span>
          <input
            name="whatsappNumber"
            defaultValue={settings.whatsapp.number ?? ""}
            placeholder="2348163631011"
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-xs text-muted">
            Message the chat opens with (optional)
          </span>
          <input
            name="whatsappMessage"
            defaultValue={settings.whatsapp.message}
            placeholder="Hi! I have a question about an item."
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        {/* ---- Abandoned checkout ---- */}
        <h2 className="mt-12 text-lg font-semibold">Abandoned checkout</h2>
        <p className="mt-1 text-sm text-muted">
          Baskets and unpaid orders left alone for a while. You can always send
          a reminder by hand from the Abandoned page; this switch is for sending
          one automatically.
        </p>

        <label className="mt-5 flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="abandonedEmailEnabled"
            defaultChecked={settings.abandoned.enabled}
            className="size-4 accent-brand"
          />
          Send the reminder automatically
        </label>

        <label className="mt-5 block max-w-xs">
          <span className="text-xs text-muted">Wait this many hours first</span>
          <input
            name="abandonedAfterHours"
            type="number"
            min={1}
            defaultValue={settings.abandoned.afterHours}
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <button
          type="submit"
          className="mt-8 bg-brand px-8 py-3 text-sm text-white"
        >
          Save settings
        </button>
      </form>

      <section className="mt-14 border-t border-line pt-10">
        <h2 className="text-lg font-semibold">Email</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Receipts, password resets and verification links all go out through
          this. The settings live in the server&rsquo;s own environment
          variables, not in the site, so a shop can work perfectly in testing
          and still send nothing once live.
        </p>

        {email.configured ? (
          <div className="mt-4 border border-line p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-green-700">
              <MailCheck aria-hidden className="size-4" />
              Configured
            </p>
            <p className="mt-1 text-muted">
              Sending as {email.user} through {email.host}:{email.port}
              {connection.ok ? null : (
                <>
                  {" "}
                  &mdash;{" "}
                  <span className="text-red-600">
                    but the server refused the connection: {connection.error}
                  </span>
                </>
              )}
            </p>
            {connection.ok && (
              <p className="mt-1 text-muted">
                The mail server accepted this login, so sending works.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 border border-red-200 bg-red-50 p-4 text-sm">
            <p className="font-semibold text-red-700">
              Not configured &mdash; no email is being sent
            </p>
            <p className="mt-1 text-red-700">
              Missing: {email.missing.join(", ")}. Add these in your hosting
              panel&rsquo;s environment variables, then restart the app.
            </p>
          </div>
        )}

        <form action={sendTestEmailAction} className="mt-5 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs text-muted">Send a test email to</span>
            <input
              name="to"
              type="email"
              required
              defaultValue={email.user ?? ""}
              className="mt-1.5 w-72 border border-line px-4 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>
          <button
            type="submit"
            className="bg-brand px-6 py-2.5 text-sm text-white"
          >
            Send test
          </button>
        </form>
        <p className="mt-2 text-xs text-muted">
          Check the inbox, and the spam folder. If it lands in spam, your domain
          needs SPF and DKIM records.
        </p>
      </section>

      <section className="mt-14 border-t border-line pt-10">
        <h2 className="text-lg font-semibold">Homepage promises</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The four blocks under the home page. Clear a title to remove one.
        </p>

        <form action={saveValueProps} className="mt-6 space-y-4">
          {slots.map((prop, index) => (
            <div
              key={index}
              className="flex flex-wrap items-end gap-3 border border-line p-4"
            >
              <label className="w-32">
                <span className="text-xs text-muted">Icon</span>
                <select
                  name="icon"
                  defaultValue={prop?.icon ?? "truck"}
                  className="mt-1.5 w-full border border-line px-2 py-2 text-sm"
                >
                  {Object.keys(VALUE_PROP_ICONS).map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-44 flex-1">
                <span className="text-xs text-muted">Title</span>
                <input
                  name="title"
                  defaultValue={prop?.title ?? ""}
                  placeholder="Free Shipping"
                  className="mt-1.5 w-full border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </label>

              <label className="min-w-56 flex-[2]">
                <span className="text-xs text-muted">Description</span>
                <input
                  name="body"
                  defaultValue={prop?.body ?? ""}
                  placeholder="Free shipping on orders above ₦150,000"
                  className="mt-1.5 w-full border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </label>
            </div>
          ))}

          <button
            type="submit"
            className="bg-brand px-8 py-3 text-sm text-white"
          >
            Save promises
          </button>
        </form>
      </section>

      <section className="mt-14 border-t border-line pt-10">
        <h2 className="text-lg font-semibold">Footer links</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Both footer columns. Clear a label to remove a link; every link needs a
          destination.
        </p>

        <form action={saveFooterLinks} className="mt-6 grid gap-8 md:grid-cols-2">
          {(["information", "service"] as const).map((column) => {
            const rows = [...columns[column], ...Array(6).fill(null)].slice(0, 6);

            return (
              <div key={column}>
                <h3 className="text-sm font-semibold capitalize">{column}</h3>
                <div className="mt-3 space-y-2">
                  {rows.map((row, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        name={`${column}-label`}
                        defaultValue={row?.label ?? ""}
                        placeholder="Label"
                        className="min-w-0 flex-1 border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                      />
                      <input
                        name={`${column}-href`}
                        defaultValue={row?.href ?? ""}
                        placeholder="/shop"
                        className="min-w-0 flex-1 border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-brand px-8 py-3 text-sm text-white"
            >
              Save footer links
            </button>
          </div>
        </form>
      </section>

      <p className="mt-8 max-w-2xl rounded border border-dashed border-line px-3 py-2 text-xs text-muted">
        The storefront advertises &ldquo;free shipping over
        &#8358;150,000&rdquo; in its value-props row. If you change the threshold
        here, update that copy too or the two will disagree.
      </p>
    </div>
  );
}
