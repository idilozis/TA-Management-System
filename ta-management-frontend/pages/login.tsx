// "use client"

// import { useState } from "react"
// import { useRouter } from "next/router"
// import Link from "next/link"
// import axios from "axios"
// import { useForm } from "react-hook-form"
// import { zodResolver } from "@hookform/resolvers/zod"
// import * as z from "zod"
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Button } from "@/components/ui/button"
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
// import { Alert, AlertDescription } from "@/components/ui/alert"

// const formSchema = z.object({
//   email: z.string().email({ message: "Invalid email address" }),
//   password: z.string().min(6, { message: "Password must be at least 6 characters" }),
// })

// const Login = () => {
//   const router = useRouter()
//   const [message, setMessage] = useState("")

//   const form = useForm<z.infer<typeof formSchema>>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       email: "",
//       password: "",
//     },
//   })

//   const onSubmit = async (values: z.infer<typeof formSchema>) => {
//     try {
//       const response = await axios.post("http://localhost:5000/login", values, {
//         headers: {
//           "Content-Type": "application/json",
//         },
//       })
//       setMessage(response.data.message)
//       setTimeout(() => {
//         router.push("/") // Redirect to home or dashboard after login
//       }, 1000)
//     } catch (error: any) {
//       if (error.response && error.response.data && error.response.data.message) {
//         setMessage(error.response.data.message)
//       } else {
//         setMessage("Login failed. Please try again.")
//       }
//     }
//   }

//   return (
//     <div className="flex justify-center items-center min-h-screen bg-gray-100">
//       <Card className="w-full max-w-md">
//         <CardHeader>
//           <CardTitle>Login</CardTitle>
//           <CardDescription>Enter your credentials to access your account</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <Form {...form}>
//             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
//               <FormField
//                 control={form.control}
//                 name="email"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Email</FormLabel>
//                     <FormControl>
//                       <Input placeholder="Enter your email" {...field} />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <FormField
//                 control={form.control}
//                 name="password"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Password</FormLabel>
//                     <FormControl>
//                       <Input type="password" placeholder="Enter your password" {...field} />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <Button type="submit" className="w-full">
//                 Login
//               </Button>
//             </form>
//           </Form>
//           {message && (
//             <Alert variant="destructive" className="mt-4">
//               <AlertDescription>{message}</AlertDescription>
//             </Alert>
//           )}
//         </CardContent>
//         <CardFooter className="flex justify-center">
//           <p>
//             Don't have an account?{" "}
//             <Link href="/register" className="text-blue-500 hover:underline">
//               Register
//             </Link>
//           </p>
//         </CardFooter>
//       </Card>
//     </div>
//   )
// }

// export default Login
// "use client"

// import type React from "react"

// import { useState } from "react"
// import { useRouter } from "next/router"
// import Link from "next/link"
// import axios from "axios"
// import styles from "./login.module.css"
// import Head from "next/head"

// const Login = () => {
//   const router = useRouter()
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//   })
//   const [message, setMessage] = useState("")

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     try {
//       const response = await axios.post("http://localhost:5000/login", formData, {
//         headers: {
//           "Content-Type": "application/json",
//         },
//       })
//       setMessage(response.data.message)
//       setTimeout(() => {
//         router.push("/")
//       }, 1000)
//     } catch (error: any) {
//       if (error.response?.data?.message) {
//         setMessage(error.response.data.message)
//       } else {
//         setMessage("Login failed. Please try again.")
//       }
//     }
//   }

//   return (
//     <>
//       <Head>
//         <link
//           href="https://fonts.googleapis.com/css2?family=Titillium+Web:wght@300;400;600;700&display=swap"
//           rel="stylesheet"
//         />
//       </Head>
//       <div className={styles.container}>
//         <div className={styles.formWrapper}>
//           <form onSubmit={handleSubmit} className={styles.form}>
//             <h1 className={styles.title}>Welcome!</h1>
//             <p className={styles.subtitle}>Please enter your details to sign in</p>

//             <div className={styles.inputGroup}>
//               <label htmlFor="email" className={styles.label}>
//                 Email
//               </label>
//               <input
//                 id="email"
//                 type="email"
//                 placeholder="Enter your email"
//                 value={formData.email}
//                 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
//                 className={styles.input}
//                 required
//               />
//             </div>

//             <div className={styles.inputGroup}>
//               <div className={styles.labelRow}>
//                 <label htmlFor="password" className={styles.label}>
//                   Password
//                 </label>
//                 <Link href="/forgot-password" className={styles.forgotPassword}>
//                   Forgot password?
//                 </Link>
//               </div>
//               <input
//                 id="password"
//                 type="password"
//                 placeholder="Enter your password"
//                 value={formData.password}
//                 onChange={(e) => setFormData({ ...formData, password: e.target.value })}
//                 className={styles.input}
//                 required
//               />
//             </div>

//             <button type="submit" className={styles.button}>
//               Sign in
//             </button>

//             {message && <p className={`${styles.message} ${styles.error}`}>{message}</p>}

//             <p className={styles.register}>
//               Don't have an account?{" "}
//               <Link href="/register" className={styles.registerLink}>
//                 Sign up
//               </Link>
//             </p>
//           </form>
//         </div>
//       </div>
//     </>
//   )
// }

// export default Login


