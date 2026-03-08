import { Toaster } from "@/components/ui/sonner";
import NewReportPage from "@/pages/NewReportPage";
import ReportsPage from "@/pages/ReportsPage";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import { ClipboardList, PlusSquare } from "lucide-react";

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const tabs = [
    {
      to: "/new-report" as const,
      label: "New Report",
      icon: PlusSquare,
      ocid: "nav.new_report.tab",
    },
    {
      to: "/reports" as const,
      label: "Reports",
      icon: ClipboardList,
      ocid: "nav.reports.tab",
    },
  ] as const;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border safe-bottom"
      style={{ height: "var(--nav-height)" }}
    >
      <div className="flex h-full">
        {tabs.map(({ to, label, icon: Icon, ocid }) => {
          const isActive =
            pathname === to ||
            (to === "/new-report" && (pathname === "/" || pathname === ""));
          return (
            <Link
              key={to}
              to={to}
              data-ocid={ocid}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : "scale-100"}`}
              />
              <span className="text-[10px] font-medium tracking-wide uppercase">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      <BottomNav />
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "oklch(0.17 0.008 270)",
            border: "1px solid oklch(0.22 0.008 270)",
            color: "oklch(0.94 0.008 80)",
          },
        }}
      />
    </div>
  );
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: NewReportPage,
});

const newReportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/new-report",
  component: NewReportPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports",
  component: ReportsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  newReportRoute,
  reportsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return <RouterProvider router={router} />;
}
