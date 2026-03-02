// 'use server';
// import { z } from 'zod';

// import { validatedAction } from "@/lib/auth/middleware";

// const billSchema = z.object({
//     name: z.string().min(4, "Name is too short"),
//     amount: z.coerce.number().positive().gt(0),
//     dueDate: z.coerce.date(),
//     recurring: z.preprocess((val) => val === "on" || val === true, z.boolean())
// })

// export const addBill = validatedAction(billSchema, async (data) => {
//   // implement logic here
//   // console.log(data, 'data')
//   return {
//     success: "Validation successful",
//     name: data?.name,
//     amount: data?.amount
//   }
// });