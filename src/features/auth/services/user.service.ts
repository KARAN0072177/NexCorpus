import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "../models/user.model";

interface CreateUserInput {
  googleId: string;
  email: string;
  name?: string;
  image?: string;
}

export async function findUserByGoogleId(googleId: string) {
  await connectToDatabase();

  return User.findOne({ googleId });
}

export async function findUserByEmail(email: string) {
  await connectToDatabase();

  return User.findOne({ email });
}

export async function findUserById(userId: string) {
  await connectToDatabase();

  return User.findById(userId);
}

export async function findUserByUsername(username: string) {
  await connectToDatabase();

  return User.findOne({ username });
}

export async function createUser(input: CreateUserInput) {
  await connectToDatabase();

  return User.create({
    googleId: input.googleId,
    email: input.email,
    name: input.name,
    image: input.image,
  });
}

export async function updateUsername(
  userId: string,
  username: string
) {
  await connectToDatabase();

  return User.findByIdAndUpdate(
    userId,
    {
      $set: {
        username,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );
}