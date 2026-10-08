import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  console.error("Root Error Boundary caught error:", error);
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F5F0] px-4">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-lg ring-1 ring-[#0F3D24]/10">
        <h1 className="text-xl font-bold tracking-tight text-[#0F3D24]">
          Temporary Loading Issue
        </h1>
        <p className="mt-2 text-sm text-[#0F3D24]/70">
          Something went wrong while loading this view. You can retry safely without losing your session.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              void router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#134a2c]"
          >
            Retry loading
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-[#0F3D24]/15 bg-white px-5 py-2.5 text-sm font-semibold text-[#0F3D24] transition hover:bg-[#0F3D24]/5"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dignity Agro Farms Limited · Poultry Farming Rooted in Care" },
      { name: "description", content: "Dignity Agro Farms Limited offers broiler and layer supply, fresh eggs, poultry production and farm consultancy in Nigeria. Rooted in Care. Driven by Purpose. Growing with Integrity." },
      { name: "author", content: "Dignity Agro Farms Limited" },
      { name: "keywords", content: "poultry farm Nigeria, fresh eggs supply, broiler farming, layer farming, poultry production, farm consultancy, Ikenegbu" },
      { property: "og:url", content: "https://dignityagrofarms.com" },
      { property: "og:title", content: "Dignity Agro Farms Limited" },
      { property: "og:description", content: "Poultry farming rooted in care: broilers, layers, fresh eggs and consultancy." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://dignityagrofarms.com/favicon.png" },
      { property: "og:site_name", content: "Dignity Agro Farms" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@dignityagrofarms" },
      { name: "twitter:title", content: "Dignity Agro Farms Limited" },
      { name: "twitter:description", content: "Poultry farming rooted in care: broilers, layers, fresh eggs and consultancy." },
      { name: "theme-color", content: "#0F3D24" },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://dignityagrofarms.com",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Dignity Agro Farms Limited",
    "image": "https://dignityagrofarms.com/favicon.png",
    "url": "https://dignityagrofarms.com",
    "telephone": "+2348167099492",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "9 Oduobi Crescent",
      "addressLocality": "Ikenegbu",
      "addressCountry": "NG"
    },
    "sameAs": [
      "https://facebook.com/dignityagrofarms",
      "https://instagram.com/dignityagrofarms"
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
