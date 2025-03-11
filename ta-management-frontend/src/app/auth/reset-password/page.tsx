import { Suspense } from "react"; // for "npm run build" command
import ResetPassword from "./reset-password";

export default function ResetPasswordPage() {
  return (
    <div>

      {/* Dynamic client-side part wrapped in Suspense */}
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <ResetPassword />
      </Suspense>

    </div>
  );
}
