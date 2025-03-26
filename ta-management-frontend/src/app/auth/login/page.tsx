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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

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
      rememberMe: false,
    },
  });

  useEffect(() => {
    apiClient.get("/auth/csrf/").catch((err) => {
      console.error("Error setting CSRF cookie:", err);
    });
  }, []);

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
        console.log("Login success, userType = ", userType);

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
    <div className="relative flex flex-col min-h-screen bg-black overflow-hidden">
      {/* Top Header */}
     
      {/* BILKENT background text */}
      <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 text-[15rem] font-bold text-white/5 select-none">
        BİLKENT
      </div>

      {/* Form Card */}
      <div className="flex flex-1 justify-center items-center z-10">
        <Card className="w-full max-w-md bg-black border border-gray-700 p-6 rounded-2xl shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold text-white">
              Welcome to TA Management System.
            </CardTitle>
            <CardDescription className="text-gray-400">
              Please enter your credentials to begin.
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
                      <FormLabel className="text-white">
                        Enter Email <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input placeholder="Enter your email" {...field} className="pr-10 bg-black text-white placeholder-gray-500 autofill:bg-black" />
                          <Mail className="absolute right-2 top-2.5 h-5 w-5 text-gray-400" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">
                        Enter Password <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            {...field}
                            className="pr-10 bg-black text-white placeholder-gray-500 autofill:bg-black"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-2 top-2.5 text-gray-400"
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
                      <FormLabel htmlFor="rememberMe" className="mb-0 text-white">
                        Remember Me
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full text-white border border-transparent hover:border-white bg-blue-700 transition duration-200"
                >
                  Sign In
                </Button>

              </form>
            </Form>

            {message && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="justify-start">
            <Link href="/auth/forgot-password" className="text-blue-600 hover:underline">
              Forgot Password?
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
