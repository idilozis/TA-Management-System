"use client";

import apiClient from "@/lib/axiosClient"; // shared Axios instance
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail } from "lucide-react";


// Form validation schema
const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});

// FORGOT PASSWORD
const ForgotPassword = () => {
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setMessage("");
    try {
      const response = await apiClient.post("/auth/forgot-password/", values, { 
        headers: { "Content-Type": "application/json" } }
      );

      setMessage(response.data.message);
      setIsSuccess(true);
    } 
    catch (error: unknown) {
      setIsSuccess(false);
      if (error instanceof Error) {
        setMessage(error.message || "Something went wrong.");
      } else {
        setMessage("Something went wrong.");
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-blue-100">
      <Card className="w-full max-w-xl shadow-md p-6">
        <CardHeader>
          <CardTitle className="flex justify-center items-center">
            Forgot Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email to receive a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input placeholder="Enter your email" {...field} />
                        <Mail className="absolute right-2 top-2 h-5 w-5 text-gray-400 pointer-events-none" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Send Reset Link
              </Button>
            </form>
          </Form>

          {message && (
            <Alert variant={isSuccess ? "default" : "destructive"} className="mt-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
