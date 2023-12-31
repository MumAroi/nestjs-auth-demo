import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthDto } from "./dto";
import * as bcrypt from "bcrypt";
import * as argon2 from "argon2";
import { Tokens } from "./types";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
@Injectable()
export class AuthService {
	constructor(
		private prisma: PrismaService,
		private jwtService: JwtService,
		private config: ConfigService,
	) {}

	async signupLocal(dto: AuthDto): Promise<Tokens> {
		const hash = await argon2.hash(dto.password);
		const newUser = await this.prisma.user.create({
			data: {
				email: dto.email,
				password: hash,
			},
		});
		const tokens = await this.getTokens(newUser.id, newUser.email);
		await this.updateRtHash(newUser.id, tokens.refresh_token);
		return tokens;
	}

	async signinLocal(dto: AuthDto): Promise<Tokens> {
		const user = await this.prisma.user.findUnique({
			where: {
				email: dto.email,
				deletedAt: null,
			},
		});

		if (!user) throw new ForbiddenException("Access Denied");

		const passwordMatches = await argon2.verify(user.password, dto.password);

		if (!passwordMatches) throw new ForbiddenException("Access Denied");

		const tokens = await this.getTokens(user.id, user.email);
		await this.updateRtHash(user.id, tokens.refresh_token);

		return tokens;
	}

	async logout(userId: number) {
		await this.prisma.user.updateMany({
			where: {
				id: userId,
				refreshToken: {
					not: null,
				},
			},
			data: {
				refreshToken: null,
			},
		});
	}

	async refreshToken(userId: number, rt: string) {
		const user = await this.prisma.user.findUnique({
			where: {
				id: userId,
				refreshToken: {
					not: null,
				},
				deletedAt: null,
			},
		});
		if (!user) throw new ForbiddenException("Access Denied");

		const rtMatches = await argon2.verify(user.refreshToken, rt);

		if (!rtMatches) throw new ForbiddenException("Access Denied");

		const tokens = await this.getTokens(user.id, user.email);
		await this.updateRtHash(user.id, tokens.refresh_token);

		return tokens;
	}

	async updateRtHash(userId: number, rt: string) {
		const hash = await argon2.hash(rt);
		await this.prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				refreshToken: hash,
			},
		});
	}

	async getTokens(userId: number, email: string) {
		const [at, rt] = await Promise.all([
			this.jwtService.signAsync(
				{
					sub: userId,
					email,
				},
				{
					secret: this.config.get<string>("AT_SECRET"),
					expiresIn: 60 * 15,
				},
			),
			this.jwtService.signAsync(
				{
					sub: userId,
					email,
				},
				{
					secret: this.config.get<string>("RT_SECRET"),
					expiresIn: 60 * 60 * 24 * 7,
				},
			),
		]);

		return {
			access_token: at,
			refresh_token: rt,
		};
	}
}
