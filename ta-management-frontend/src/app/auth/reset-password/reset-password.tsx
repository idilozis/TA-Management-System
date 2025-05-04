"use client";

import apiClient from "@/lib/axiosClient";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import "@/app/auth/text-image.css";


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
        setMessage(error.message || "Something went wrong.");
      } else {
        setMessage("Something went wrong.");
      }
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-blue-950 overflow-hidden z-0">
      {/* NOT WORKING WHEN text-transparent is used BILKENT background text with campus images */}
      <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 text-[14rem] font-bold text-transparent select-none bilkent-text">
        BİLKENT
      </div>

      {/* Main Reset Password Form */}
      <div className="flex flex-1 justify-center items-center z-10 px-4">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white border-4 border-red-700 p-4 rounded-2xl shadow-xl w-120 max-w-md">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-2xl font-bold text-center">
                  Reset Password
                </CardTitle>
                <CardDescription className="text-center text-gray-600">
                  Enter a new password for your account
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {message && (
                  <Alert
                    variant={isSuccess ? "default" : "destructive"}
                    className="mb-4"
                  >
                    <AlertDescription>
                      {message}
                      {redirecting && (
                        <div className="mt-2">
                          Redirecting to login page...
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {!isSuccess && (
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      {/* Password */}
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="password"
                                  placeholder="Enter your new password"
                                  className="pr-10"
                                  {...field}
                                />
                              </div>
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
                              <div className="relative">
                                <Input
                                  type="password"
                                  placeholder="Confirm your new password"
                                  className="pr-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full text-white border border-transparent hover:border-white bg-blue-600 hover:bg-blue-400 transition duration-200"
                        disabled={!token || redirecting}
                      >
                        Reset Password
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
              <CardFooter className="flex justify-start pb-4">
                <Link href="/auth/login" className="text-blue-600 hover:underline">
                  Back to Login
                </Link>
              </CardFooter>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}