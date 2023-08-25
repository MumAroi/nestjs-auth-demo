import { IsEmail, IsNotEmpty, IsString } from "class-validator";
export class AuthDto {
	@IsNotEmpty()
	@IsString()
	email: string;

	@IsNotEmpty()
	@IsEmail()
	password: string;
}
