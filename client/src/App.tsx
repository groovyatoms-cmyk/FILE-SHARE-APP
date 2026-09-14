import { RouterProvider } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { AppThemeProvider } from "./theme/AppThemeProvider";
import { router } from "./router/router";

export function App() {
  return (
    <AppThemeProvider>
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <RouterProvider router={router} />
      </SnackbarProvider>
    </AppThemeProvider>
  );
}
