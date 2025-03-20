"use client";

import apiClient from "@/lib/axiosClient";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Mail, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

// Form validation schema
const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  rememberMe: z.boolean().optional(),
});

const Login = () => {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false, // default unchecked
    },
  });

  // Call the CSRF endpoint once to ensure the cookie is set
  useEffect(() => {
    apiClient.get("/auth/csrf/")
      .catch((err) => {
        console.error("Error setting CSRF cookie:", err);
      });
  }, []);

  // Remember Me
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberEmail");
    if (savedEmail) {
      form.setValue("email", savedEmail);
      form.setValue("rememberMe", true);
    }
  }, [form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await apiClient.post("/auth/login/", values, {
        headers: { "Content-Type": "application/json" },
      });

      setMessage(response.data.message);

      if (response.data.status === "success") {
        const userType = response.data.userType;
        console.log("Login success, userType =", userType);

        // Save only email if "Remember Me" is checked
        if (values.rememberMe) {
          localStorage.setItem("rememberEmail", values.email);
        } else {
          localStorage.removeItem("rememberEmail");
        }
        setTimeout(() => router.push("/home-page"), 1000);
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message || "Login failed. Please try again.");
      } else {
        setMessage("Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-blue-100">
      <Card className="w-full max-w-xl shadow-md p-6">
        
        <CardHeader>
          <CardTitle className="flex justify-center items-center">
            Welcome!
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to sign in.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enter Email</FormLabel>
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

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enter Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          {...field}
                        />
                        {/* Show/Hide password button */}
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-2 top-2 text-gray-400"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Remember Me Checkbox */}
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        id="rememberMe"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel htmlFor="rememberMe">Remember Me</FormLabel>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Sign In {'>'}
              </Button>

            </form>
          </Form>

          {message && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        {/* Forgot Password? */}
        <CardFooter className="flex justify-between">
          <Link href="/auth/forgot-password" className="text-blue-600 hover:underline">
            Forgot Password?
          </Link>
        </CardFooter>
        
      </Card>
    </div>
  );
};

export default Login;
