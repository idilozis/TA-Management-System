"use client";

import apiClient from "@/lib/axiosClient";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Form validation schema
const formSchema = z
  .object({
    password: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

// RESET PASSWORD
export default function ResetPassword() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!token) {
      setMessage("Invalid or missing reset link.");
    }
  }, [token]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!token) {
      setMessage("Invalid or missing reset link.");
      return;
    }

    try {
      const response = await apiClient.post(
        "/auth/reset-password/",
        { token, password: values.password },
        { headers: { "Content-Type": "application/json" } }
      );
      
      setMessage(response.data.message);
      setIsSuccess(true);
      
      // Redirect to login page after successful password reset
      if (response.data.redirect_url) {
        setRedirecting(true);
        setTimeout(() => {
          router.push(response.data.redirect_url);
        }, 3000);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(error.message || "Someting went wrong.");
      } else {
        setMessage("Something went wrong.");
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-blue-100">
      <Card className="w-full max-w-xl shadow-md p-6">
        
        <CardHeader>
          <CardTitle className="flex justify-center items-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter a new password for your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          {message && (
            <Alert variant={isSuccess ? "default" : "destructive"} className="mb-4">
              <AlertDescription>
                {message}
                {redirecting && <div className="mt-2">Redirecting to login page...</div>}
              </AlertDescription>
            </Alert>
          )}

          {!isSuccess && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your new password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirm Password */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm your new password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={!token || redirecting}>
                  Reset Password
                </Button>

              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
