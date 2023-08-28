import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthDto } from "./dto";
import { Tokens } from "./types";
import { GetCurrentUser, GetCurrentUserId } from "src/common/decorators";
import { Public } from "src/common/decorators";
import { RtGuard } from "src/common/guards";

@Controller("auth")
export class AuthController {
	constructor(private authService: AuthService) {}

	@Public()
	@Post("signup")
	@HttpCode(HttpStatus.CREATED)
	signupLocal(@Body() dto: AuthDto): Promise<Tokens> {
		return this.authService.signupLocal(dto);
	}

	@Public()
	@Post("signin")
	@HttpCode(HttpStatus.OK)
	signinLocal(@Body() dto: AuthDto): Promise<Tokens> {
		return this.authService.signinLocal(dto);
	}

	@Post("logout")
	@HttpCode(HttpStatus.OK)
	logout(@GetCurrentUserId() userId: number): Promise<void> {
		return this.authService.logout(userId);
	}

	@Public()
	@UseGuards(RtGuard)
	@Post("refresh")
	@HttpCode(HttpStatus.OK)
	refreshToken(
		@GetCurrentUserId() userId: number,
		@GetCurrentUser("refreshToken") refreshToken: string,
	): Promise<Tokens> {
		return this.authService.refreshToken(userId, refreshToken);
	}
}
