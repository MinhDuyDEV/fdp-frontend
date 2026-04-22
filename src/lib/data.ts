import type { ReadMode } from "@/lib/readStrategy";
import type { Chapter, Genre, Manga, UserComment } from "@/types";
import type {
	Chapter as BackendChapter,
	Comment as BackendComment,
	BackendGenre,
	Story,
} from "@/types/api";

// ─── GENRE MAPPING ───────────────────────────────────────────────────────────

const genreToDisplayMap: Record<BackendGenre, Genre> = {
	Action: "Hành động",
	Horror: "Kinh dị",
	Romance: "Lãng mạn",
	Detective: "Trinh thám",
};

export const genreReverseMap: Record<Genre, BackendGenre> = {
	"Hành động": "Action",
	"Kinh dị": "Horror",
	"Lãng mạn": "Romance",
	"Trinh thám": "Detective",
};

export function storyToManga(story: Story): Manga {
	return {
		id: String(story.id),
		title: story.title,
		titleJP: "",
		genre: genreToDisplayMap[story.genre],
		author: story.author,
		coverUrl: story.coverImage || "",
		coverFallback: "#1a1a1a",
		rating: 0,
		views: "0",
		synopsis: story.description,
		tags: [genreToDisplayMap[story.genre]],
		chapters: [],
		status: "Đang tiến hành",
		year: new Date(story.createdAt).getFullYear(),
	};
}

// Adapt backend Chapter → frontend Chapter shape
export function chapterToMangaChapter(ch: BackendChapter): Chapter {
	return {
		id: String(ch.id),
		number: ch.chapterNumber,
		title: ch.title || `Chương ${ch.chapterNumber}`,
		date: new Date(ch.createdAt).toLocaleDateString("vi-VN"),
		pages: 1,
	};
}

// Adapt backend Comment → frontend UserComment shape (idempotent)
export function commentToUserComment(c: BackendComment): UserComment {
	return {
		id: String(c.id),
		mangaId: String(c.storyId),
		user: `User #${c.userId}`,
		text: c.content,
		createdAt: new Date(c.createdAt).getTime(),
	};
}

// Add chapters to a Manga object from a Story
export function addChaptersToManga(
	manga: Manga,
	backendChapters: BackendChapter[],
): Manga {
	return {
		...manga,
		chapters: backendChapters.map(chapterToMangaChapter),
	};
}

// Each genre subclass extends BaseManga with genre-specific metadata AND behavior.
// The Factory creates the correct subclass based on genre, enabling polymorphism.

abstract class BaseManga {
	abstract genre: Genre;
	abstract accentColor: string; // used for UI theming per genre
	abstract labelEN: string;

	// ── Behavioral methods — each genre implements differently ──

	/** Recommended reading mode for this genre */
	abstract getRecommendedReadMode(): ReadMode;

	/** Content warning text, or null if none needed */
	abstract getContentWarning(): string | null;

	/** Icon/emoji representing the genre */
	abstract getGenreIcon(): string;
}

class ActionMangaType extends BaseManga {
	genre: Genre = "Hành động";
	accentColor = "#c0392b";
	labelEN = "ACTION";

	getRecommendedReadMode(): ReadMode {
		return "scroll";
	}
	getContentWarning(): string | null {
		return "Chứa cảnh bạo lực";
	}
	getGenreIcon(): string {
		return "⚔️";
	}
}

class HorrorMangaType extends BaseManga {
	genre: Genre = "Kinh dị";
	accentColor = "#2c3e50";
	labelEN = "HORROR";

	getRecommendedReadMode(): ReadMode {
		return "night";
	}
	getContentWarning(): string | null {
		return "Nội dung kinh dị — không phù hợp trẻ em";
	}
	getGenreIcon(): string {
		return "👻";
	}
}

class RomanceMangaType extends BaseManga {
	genre: Genre = "Lãng mạn";
	accentColor = "#8e4585";
	labelEN = "ROMANCE";

	getRecommendedReadMode(): ReadMode {
		return "day";
	}
	getContentWarning(): string | null {
		return null;
	}
	getGenreIcon(): string {
		return "💕";
	}
}

class MysteryMangaType extends BaseManga {
	genre: Genre = "Trinh thám";
	accentColor = "#1a5276";
	labelEN = "MYSTERY";

	getRecommendedReadMode(): ReadMode {
		return "page-flip";
	}
	getContentWarning(): string | null {
		return null;
	}
	getGenreIcon(): string {
		return "🔍";
	}
}

export class MangaFactory {
	static create(genre: Genre): BaseManga {
		switch (genre as string) {
			case "Hành động":
				return new ActionMangaType();
			case "Kinh dị":
				return new HorrorMangaType();
			case "Lãng mạn":
				return new RomanceMangaType();
			case "Trinh thám":
				return new MysteryMangaType();
		}
		// Fallback for runtime safety — should never hit with TypeScript
		return new ActionMangaType();
	}

	static createFromBackend(genre: BackendGenre): BaseManga {
		return MangaFactory.create(genreToDisplayMap[genre]);
	}

	// ── Data helpers (backward compatible) ──

	static getAccent(genre: Genre | BackendGenre): string {
		if (genreToDisplayMap[genre as BackendGenre]) {
			return MangaFactory.createFromBackend(genre as BackendGenre).accentColor;
		}
		return MangaFactory.create(genre as Genre).accentColor;
	}

	static getLabelEN(genre: Genre | BackendGenre): string {
		if (genreToDisplayMap[genre as BackendGenre]) {
			return MangaFactory.createFromBackend(genre as BackendGenre).labelEN;
		}
		return MangaFactory.create(genre as Genre).labelEN;
	}

	// ── Behavioral helpers ──

	static getRecommendedReadMode(genre: Genre | BackendGenre): ReadMode {
		if (genreToDisplayMap[genre as BackendGenre]) {
			return MangaFactory.createFromBackend(
				genre as BackendGenre,
			).getRecommendedReadMode();
		}
		return MangaFactory.create(genre as Genre).getRecommendedReadMode();
	}

	static getContentWarning(genre: Genre | BackendGenre): string | null {
		if (genreToDisplayMap[genre as BackendGenre]) {
			return MangaFactory.createFromBackend(
				genre as BackendGenre,
			).getContentWarning();
		}
		return MangaFactory.create(genre as Genre).getContentWarning();
	}

	static getGenreIcon(genre: Genre | BackendGenre): string {
		if (genreToDisplayMap[genre as BackendGenre]) {
			return MangaFactory.createFromBackend(
				genre as BackendGenre,
			).getGenreIcon();
		}
		return MangaFactory.create(genre as Genre).getGenreIcon();
	}

	static getDisplayGenre(genre: BackendGenre): Genre {
		return genreToDisplayMap[genre];
	}
}

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
// Covers sourced from MangaDex public CDN — no auth required.
// Page content uses placeholder images (demo only).

// mangadexId = real MangaDex chapter UUID for fetching actual pages
const ch = (
	n: number,
	title: string,
	date: string,
	pages: number,
	mangadexId?: string,
) => ({
	id: `ch-${n}`,
	number: n,
	title,
	date,
	pages,
	mangadexId,
});

export const mangaData: Manga[] = [
	{
		id: "chainsaw-man",
		title: "Chainsaw Man",
		titleJP: "チェンソーマン",
		genre: "Hành động",
		author: "Tatsuki Fujimoto",
		coverUrl:
			"https://uploads.mangadex.org/covers/a77742b1-befd-49a4-bff5-1ad4e6b136d5/e81fe66e-61ca-4e22-b254-8dc32e8a2987.jpg.512.jpg",
		coverFallback: "#1a0a00",
		rating: 4.9,
		views: "12.4M",
		status: "Đang tiến hành",
		year: 2018,
		synopsis:
			"Denji là một thiếu niên nghèo khổ làm thợ săn quỷ để trả nợ cho cha. Sau khi bị phản bội và giết hại, anh hợp nhất với con quỷ cưa xích Pochita — trở thành Chainsaw Man, một con lai người-quỷ với sức mạnh vô song.",
		tags: ["Siêu nhiên", "Bạo lực", "Seinen", "Shōnen Jump+"],
		// mangadexId = MangaDex manga UUID — used to fetch real chapters + pages
		mangadexId: "a77742b1-befd-49a4-bff5-1ad4e6b136d5",
		chapters: [
			ch(
				1,
				"Con chó và cưa xích",
				"03/2018",
				45,
				"7ffa6b78-6d0c-4f5e-b478-442aaa51c03f",
			),
			ch(2, "Katana vs Cưa xích", "04/2018", 38),
			ch(3, "Quỷ súng", "05/2018", 40),
			ch(4, "Trái tim của Makima", "06/2018", 36),
			ch(5, "Bữa tiệc địa ngục", "07/2018", 42),
		],
	},
	{
		id: "uzumaki",
		title: "Uzumaki",
		titleJP: "渦巻",
		genre: "Kinh dị",
		author: "Junji Ito",
		coverUrl:
			"https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-a917-d6b347e5d352/2c14a87a-3bb0-411e-9c94-bb85e4cb2eba.jpg.512.jpg",
		coverFallback: "#0d0d0d",
		rating: 4.8,
		views: "8.1M",
		status: "Hoàn thành",
		year: 1998,
		synopsis:
			"Kurozu-cho — một thị trấn nhỏ bên bờ biển đang dần bị ám ảnh bởi hình xoắn ốc. Shuichi và Kirie chứng kiến cả thị trấn mất đi lý trí vì một thứ hình học bất thường đến từ bóng tối của vũ trụ.",
		tags: ["Psychological", "Gore", "Seinen", "Big Comic Spirits"],
		mangadexId: "f4cfbb1c-766e-49db-ae80-1a5db3cbcc1b",
		chapters: [
			ch(1, "Xoắn ốc đầu tiên", "08/1998", 50),
			ch(2, "Tóc xoắn ốc", "09/1998", 44),
			ch(3, "Xoắn ốc trong mắt", "10/1998", 48),
			ch(4, "Ốc sên", "11/1998", 42),
		],
	},
	{
		id: "kaguya-sama",
		title: "Kaguya-sama: Love is War",
		titleJP: "かぐや様は告らせたい",
		genre: "Lãng mạn",
		author: "Aka Akasaka",
		coverUrl:
			"https://uploads.mangadex.org/covers/f9c33607-9180-4ba6-b85c-e4b5faee7192/c4b7cf13-7461-4e9b-8dba-b6ca8f0c56e9.jpg.512.jpg",
		coverFallback: "#1a0018",
		rating: 4.7,
		views: "9.3M",
		status: "Hoàn thành",
		year: 2015,
		synopsis:
			"Miyuki Shirogane và Kaguya Shinomiya — hai học sinh ưu tú nhất trường Shuchiin. Cả hai đều yêu nhau nhưng quá kiêu ngạo để thú nhận. Thay vào đó, họ ra sức lên kế hoạch khiến đối phương phải thổ lộ trước.",
		tags: ["Comedy", "School", "Seinen", "Weekly Young Jump"],
		mangadexId: "f9c33607-9180-4ba6-b85c-e4b5faee7192",
		chapters: [
			ch(1, "Kaguya muốn bị tỏ tình", "05/2015", 32),
			ch(2, "Shirogane muốn được hỏi thăm", "06/2015", 30),
			ch(3, "Kaguya muốn ăn cùng", "07/2015", 28),
			ch(4, "Kaguya không biết", "08/2015", 34),
			ch(5, "Chika Fujiwara muốn chơi", "09/2015", 29),
		],
	},
	{
		id: "detective-conan",
		title: "Detective Conan",
		titleJP: "名探偵コナン",
		genre: "Trinh thám",
		author: "Gosho Aoyama",
		coverUrl:
			"https://uploads.mangadex.org/covers/c52b2ce3-7f95-469c-96b0-479524fb7a1a/4e72e6a9-25fc-4f01-8c57-37ee0e43a0e8.jpg.512.jpg",
		coverFallback: "#001a33",
		rating: 4.6,
		views: "25.7M",
		status: "Đang tiến hành",
		year: 1994,
		synopsis:
			"Thám tử thiếu niên Shinichi Kudo bị một tổ chức bí ẩn đầu độc và trở thành đứa trẻ. Lấy tên giả là Conan Edogawa, anh ẩn náu bên cạnh Kogoro Mori và bí mật phá các vụ án phức tạp nhất.",
		tags: ["Mystery", "Police", "Shounen", "Weekly Shōnen Sunday"],
		mangadexId: "7f30dfc3-0b80-4dcc-a3b9-0cd746fac005",
		chapters: [
			ch(
				1,
				"Tên thám tử thu nhỏ",
				"01/1994",
				54,
				"5bf47393-379d-48f4-be24-0fbb3efef4dd",
			),
			ch(2, "Vụ án trên tàu", "02/1994", 48),
			ch(3, "Lâu đài bí ẩn", "03/1994", 52),
			ch(4, "Mật mã thám tử", "04/1994", 46),
		],
	},
	{
		id: "berserk",
		title: "Berserk",
		titleJP: "ベルセルク",
		genre: "Hành động",
		author: "Kentaro Miura",
		coverUrl:
			"https://uploads.mangadex.org/covers/801513ba-a712-498c-8f57-cae55b38cc92/90bfc1f2-fd0c-4c86-8e52-7b48bfbf1c8a.jpg.512.jpg",
		coverFallback: "#0a0a0a",
		rating: 5.0,
		views: "18.2M",
		status: "Đang tiến hành",
		year: 1989,
		synopsis:
			"Guts — kẻ mang thanh kiếm khổng lồ — đã chiến đấu suốt đời mình. Từ một đứa trẻ sinh ra dưới thân xác mẹ chết, đến người lính đánh thuê huyền thoại, rồi trở thành kẻ bị Thương Hiệu của Sinh Vật Hy Sinh đeo đuổi mãi mãi.",
		tags: ["Dark Fantasy", "Gore", "Seinen", "Young Animal"],
		mangadexId: "801513ba-a712-498c-8f57-cae55b38cc92",
		chapters: [
			ch(
				1,
				"Guts, Người kiếm đen",
				"08/1989",
				60,
				"6310f6a1-17ee-4890-b837-2ec1b372905b",
			),
			ch(2, "Đội lính đánh thuê", "09/1989", 55),
			ch(3, "Lễ hiến tế", "10/1989", 58),
			ch(4, "Vòng xoáy số phận", "11/1989", 52),
			ch(5, "Bình minh của đế chế", "12/1989", 56),
		],
	},

	// ─── ACTION — NEW ENTRIES ────────────────────────────────────────────────────

	{
		id: "jujutsu-kaisen",
		title: "Jujutsu Kaisen",
		titleJP: "呪術廻戦",
		genre: "Hành động",
		author: "Gege Akutami",
		coverUrl:
			"https://uploads.mangadex.org/covers/c52b2ce3-7f95-469c-96b0-479524fb7a1a/7dc752c3-8c90-468e-8c75-6903e38d7c7f.jpg.512.jpg",
		coverFallback: "#1a0520",
		rating: 4.8,
		views: "15.6M",
		status: "Hoàn thành",
		year: 2018,
		synopsis:
			"Itadori Yuji — một học sinh có thể lực phi thường — vô tình nuốt ngón tay của Vua Chú thuật Ryomen Sukuna. Trở thành vật chủ của thực thể nguy hiểm nhất, Yuji gia nhập trường Chú thuật Tokyo để tìm và tiêu thụ tất cả 20 ngón tay, rồi chết cùng Sukuna.",
		tags: ["Siêu nhiên", "Chú thuật", "Shounen", "Weekly Shōnen Jump"],
		mangadexId: "c52b2ce3-7f95-469c-96b0-479524fb7a1a",
		chapters: [
			ch(
				1,
				"Ryomen Sukuna",
				"03/2018",
				54,
				"a1477730-c9e2-4b34-b9f9-d28d7de7b8e5",
			),
			ch(2, "Lời nguyền bí ẩn", "04/2018", 42),
			ch(3, "Cậu bé và lão sư", "05/2018", 38),
			ch(4, "Trận chiến đầu tiên", "06/2018", 44),
			ch(5, "Lời hứa với người chết", "07/2018", 40),
		],
	},
	{
		id: "one-punch-man",
		title: "One Punch Man",
		titleJP: "ワンパンマン",
		genre: "Hành động",
		author: "ONE / Yusuke Murata",
		coverUrl:
			"https://uploads.mangadex.org/covers/d8a959f7-648e-4c8d-8f23-f1f3f8e129f3/c46d56c9-f577-42cc-bc61-3fcbb19f8ab7.jpg.512.jpg",
		coverFallback: "#1a1a00",
		rating: 4.9,
		views: "20.1M",
		status: "Đang tiến hành",
		year: 2012,
		synopsis:
			"Saitama — một anh hùng có thể đánh bại bất kỳ đối thủ nào chỉ bằng một cú đấm. Sau 3 năm tập luyện điên cuồng, anh trở nên mạnh đến mức không còn đối thủ xứng tầm. Giờ đây, anh tìm kiếm một trận chiến thực sự có thể khiến tim mình đập nhanh trở lại.",
		tags: ["Siêu anh hùng", "Hài hước", "Seinen", "Tonari no Young Jump"],
		mangadexId: "d8a959f7-648e-4c8d-8f23-f1f3f8e129f3",
		chapters: [
			ch(1, "Một cú đấm", "06/2012", 48),
			ch(2, "Hiệp hội Anh hùng", "07/2012", 42),
			ch(3, "Genos, người máy", "08/2012", 45),
			ch(4, "Quái vật biển sâu", "09/2012", 50),
			ch(5, "Bạch tuộc tối thượng", "10/2012", 44),
		],
	},
	{
		id: "demon-slayer",
		title: "Kimetsu no Yaiba",
		titleJP: "鬼滅の刃",
		genre: "Hành động",
		author: "Koyoharu Gotouge",
		coverUrl:
			"https://uploads.mangadex.org/covers/789642f8-ca89-4e4e-8f7b-eee4d17ea08b/60530e72-f76f-45d5-b6f9-f95e05058fc3.png.512.jpg",
		coverFallback: "#0d1a0d",
		rating: 4.7,
		views: "22.8M",
		status: "Hoàn thành",
		year: 2016,
		synopsis:
			"Tanjiro Kamado sống cuộc đời bình yên bán than trên núi cho đến ngày gia đình bị quỷ tàn sát. Em gái Nezuko — người duy nhất sống sót — bị biến thành quỷ. Tanjiro quyết tâm gia nhập Sát Quỷ Đội để tìm cách biến Nezuko trở lại thành người.",
		tags: ["Quỷ", "Lịch sử", "Shounen", "Weekly Shōnen Jump"],
		mangadexId: "789642f8-ca89-4e4e-8f7b-eee4d17ea08b",
		chapters: [
			ch(1, "Tàn nhẫn", "02/2016", 52, "d5d78164-ee1b-4d77-9c4c-9f678cf27d2e"),
			ch(2, "Người lạ trên núi", "03/2016", 46),
			ch(3, "Bài thi của Sakonji", "04/2016", 40),
			ch(4, "Thanh kiếm Nichirin", "05/2016", 44),
			ch(5, "Nhiệm vụ đầu tiên", "06/2016", 48),
		],
	},

	// ─── HORROR — NEW ENTRIES ────────────────────────────────────────────────────

	{
		id: "tokyo-ghoul",
		title: "Tokyo Ghoul",
		titleJP: "東京喰種トーキョーグール",
		genre: "Kinh dị",
		author: "Sui Ishida",
		coverUrl:
			"https://uploads.mangadex.org/covers/6a1d1cb1-ecd5-40d9-89ff-9d88e40b136b/040e8ae9-4ddd-49d2-8986-56782b391714.jpg.512.jpg",
		coverFallback: "#0d0008",
		rating: 4.7,
		views: "14.5M",
		status: "Hoàn thành",
		year: 2011,
		synopsis:
			"Kaneki Ken — một sinh viên yêu sách — bị biến thành nửa người nửa ghoul sau cuộc gặp kinh hoàng với Rize. Mắc kẹt giữa hai thế giới, anh phải học cách sống chung với bản năng ăn thịt người trong khi cố giữ lấy nhân tính còn lại.",
		tags: ["Psychological", "Gore", "Seinen", "Weekly Young Jump"],
		mangadexId: "6a1d1cb1-ecd5-40d9-89ff-9d88e40b136b",
		chapters: [
			ch(1, "Bi kịch", "09/2011", 46, "196c6db3-93a4-41df-852d-fe8fb84e7280"),
			ch(2, "Nửa đêm thức giấc", "10/2011", 40),
			ch(3, "Cà phê Anteiku", "11/2011", 38),
			ch(4, "Bữa ăn đầu tiên", "12/2011", 42),
			ch(5, "Mặt nạ", "01/2012", 44),
		],
	},
	{
		id: "parasyte",
		title: "Parasyte",
		titleJP: "寄生獣",
		genre: "Kinh dị",
		author: "Hitoshi Iwaaki",
		coverUrl:
			"https://uploads.mangadex.org/covers/07823fcd-f2c9-458c-9824-3eae62b2a006/081d9e32-6ccc-4b95-86c6-d4aae3c67a21.jpg.512.jpg",
		coverFallback: "#0a0a12",
		rating: 4.6,
		views: "6.8M",
		status: "Hoàn thành",
		year: 1988,
		synopsis:
			"Một đêm, những sinh vật ký sinh từ nơi khác đến xâm nhập vào não người để kiểm soát hoàn toàn. Shinichi Izumi — một học sinh bình thường — may mắn ngăn ký sinh trùng chỉ chiếm được tay phải. Cậu và Migi — sinh vật sống trong tay — phải hợp tác để sinh tồn.",
		tags: ["Sci-Fi", "Kinh dị sinh học", "Seinen", "Afternoon"],
		mangadexId: "07823fcd-f2c9-458c-9824-3eae62b2a006",
		chapters: [
			ch(1, "Xâm lăng", "01/1988", 52, "f98543f5-1be1-45dc-834d-5a9bde1bf482"),
			ch(2, "Migi", "02/1988", 44),
			ch(3, "Kẻ thù đầu tiên", "03/1988", 48),
			ch(4, "Tamiya Ryoko", "04/1988", 40),
			ch(5, "Tiến hóa", "05/1988", 46),
		],
	},

	// ─── ROMANCE — NEW ENTRIES ───────────────────────────────────────────────────

	{
		id: "horimiya",
		title: "Horimiya",
		titleJP: "ホリミヤ",
		genre: "Lãng mạn",
		author: "HERO / Daisuke Hagiwara",
		coverUrl:
			"https://uploads.mangadex.org/covers/a25e46ec-30f7-4db6-89df-cacbc1d9a900/04feed00-d919-4c72-b355-15b37555eb1e.jpg.512.jpg",
		coverFallback: "#1a0d1a",
		rating: 4.6,
		views: "10.2M",
		status: "Hoàn thành",
		year: 2011,
		synopsis:
			"Hori Kyoko — cô gái nổi tiếng ở trường nhưng ở nhà là bà mẹ bận rộn. Miyamura Izumi — cậu bạn trầm lặng nhưng ngoài trường lại là chàng trai đầy xăm mình và khuyên tai. Khi hai thế giới bí mật va chạm, tình bạn kỳ lạ dần biến thành tình yêu.",
		tags: ["Học đường", "Slice of Life", "Shounen", "Monthly G Fantasy"],
		mangadexId: "a25e46ec-30f7-4db6-89df-cacbc1d9a900",
		chapters: [
			ch(
				1,
				"Bí mật không ai biết",
				"10/2011",
				41,
				"09a007d3-2faa-4b89-8449-cf51cbba65d7",
			),
			ch(2, "Hai khuôn mặt", "11/2011", 36),
			ch(3, "Gia đình Hori", "12/2011", 34),
			ch(4, "Ngày mưa", "01/2012", 38),
			ch(5, "Lời mời bất ngờ", "02/2012", 32),
		],
	},
	{
		id: "fruits-basket",
		title: "Fruits Basket",
		titleJP: "フルーツバスケット",
		genre: "Lãng mạn",
		author: "Natsuki Takaya",
		coverUrl:
			"https://uploads.mangadex.org/covers/e9b1d4ba-b8fb-48c3-8d52-5a4eefd05980/8aa2d91e-adb9-46e9-a119-60751128b323.jpg.512.jpg",
		coverFallback: "#1a1a0d",
		rating: 4.5,
		views: "7.4M",
		status: "Hoàn thành",
		year: 1998,
		synopsis:
			"Tohru Honda — cô gái mồ côi sống trong lều — tình cờ phát hiện bí mật của gia tộc Soma: họ bị lời nguyền 12 con giáp, biến thành động vật khi ôm người khác giới. Bằng sự dịu dàng và kiên nhẫn, Tohru dần chữa lành vết thương trong lòng mỗi thành viên.",
		tags: ["Shoujo", "Supernatural", "Drama", "Hana to Yume"],
		mangadexId: "e9b1d4ba-b8fb-48c3-8d52-5a4eefd05980",
		chapters: [
			ch(
				1,
				"Cô gái và lời nguyền",
				"07/1998",
				50,
				"7e5a7153-048d-4219-8ef8-60015ce33e48",
			),
			ch(2, "Con mèo và con chuột", "08/1998", 44),
			ch(3, "Soma Yuki", "09/1998", 42),
			ch(4, "Lời hứa ngày xưa", "10/1998", 46),
			ch(5, "Kyo và cơn mưa", "11/1998", 40),
		],
	},
	{
		id: "your-lie-in-april",
		title: "Shigatsu wa Kimi no Uso",
		titleJP: "四月は君の嘘",
		genre: "Lãng mạn",
		author: "Naoshi Arakawa",
		coverUrl:
			"https://uploads.mangadex.org/covers/eab876cc-a233-4d73-a6c3-a94e7baa70be/b383104a-d5e8-4ce1-8ba8-5a1998e1be99.jpg.512.jpg",
		coverFallback: "#0d0d1a",
		rating: 4.8,
		views: "8.9M",
		status: "Hoàn thành",
		year: 2011,
		synopsis:
			"Arima Kousei — thần đồng piano — không còn nghe được tiếng đàn sau cái chết của mẹ. Cuộc đời đơn sắc của cậu thay đổi hoàn toàn khi gặp Miyazono Kaori — cô gái chơi violin phóng khoáng đến mức cả thế giới phải dừng lại để lắng nghe.",
		tags: ["Âm nhạc", "Drama", "Shounen", "Monthly Shōnen Magazine"],
		mangadexId: "eab876cc-a233-4d73-a6c3-a94e7baa70be",
		chapters: [
			ch(1, "Tháng Tư đơn sắc", "04/2011", 46),
			ch(2, "Cô gái violin", "05/2011", 40),
			ch(3, "Âm thanh trở lại", "06/2011", 38),
			ch(4, "Sân khấu của hai người", "07/2011", 42),
			ch(5, "Bản sonata mùa xuân", "08/2011", 44),
		],
	},

	// ─── MYSTERY — NEW ENTRIES ───────────────────────────────────────────────────

	{
		id: "death-note",
		title: "Death Note",
		titleJP: "デスノート",
		genre: "Trinh thám",
		author: "Tsugumi Ohba / Takeshi Obata",
		coverUrl:
			"https://uploads.mangadex.org/covers/75ee72ab-c6bf-4b87-badd-de839156934c/d6555598-8202-477d-acde-303202cb3475.jpg.512.jpg",
		coverFallback: "#0d0d0d",
		rating: 4.9,
		views: "30.5M",
		status: "Hoàn thành",
		year: 2003,
		synopsis:
			"Light Yagami — học sinh thiên tài — nhặt được cuốn sổ tử thần do thần chết Ryuk thả xuống trần gian. Bất kỳ ai có tên được viết vào đều chết. Light quyết tâm xóa sạch tội phạm để trở thành thần của thế giới mới — nhưng thám tử thiên tài L cũng bắt đầu cuộc truy lùng.",
		tags: ["Psychological", "Supernatural", "Shounen", "Weekly Shōnen Jump"],
		mangadexId: "75ee72ab-c6bf-4b87-badd-de839156934c",
		chapters: [
			ch(
				1,
				"Sự buồn chán",
				"12/2003",
				52,
				"de7e7d14-6a13-427c-9438-feeec0f9ea96",
			),
			ch(2, "L xuất hiện", "01/2004", 46),
			ch(3, "Trò chơi trí tuệ", "02/2004", 44),
			ch(4, "Cuộc truy đuổi", "03/2004", 48),
			ch(5, "Luật chơi mới", "04/2004", 42),
		],
	},
	{
		id: "monster",
		title: "Monster",
		titleJP: "モンスター",
		genre: "Trinh thám",
		author: "Naoki Urasawa",
		coverUrl:
			"https://uploads.mangadex.org/covers/d9e30523-9d65-469e-92a2-302995770950/33f46e2f-5b20-4858-83fd-44f61aacedda.jpg.512.jpg",
		coverFallback: "#1a1a1a",
		rating: 4.9,
		views: "5.6M",
		status: "Hoàn thành",
		year: 1994,
		synopsis:
			"Dr. Kenzo Tenma — bác sĩ phẫu thuật thiên tài tại Đức — quyết định cứu một cậu bé thay vì thị trưởng thành phố. 9 năm sau, cậu bé ấy trở thành kẻ giết người hàng loạt. Tenma phải từ bỏ mọi thứ để truy lùng quái vật mà chính tay mình đã cứu sống.",
		tags: ["Psychological", "Thriller", "Seinen", "Big Comic Original"],
		mangadexId: "d9e30523-9d65-469e-92a2-302995770950",
		chapters: [
			ch(1, "Bác sĩ Tenma", "12/1994", 48),
			ch(2, "Cậu bé Johan", "01/1995", 44),
			ch(3, "9 năm sau", "02/1995", 46),
			ch(4, "Quái vật thức giấc", "03/1995", 50),
			ch(5, "Cuộc trốn chạy", "04/1995", 42),
		],
	},
	{
		id: "promised-neverland",
		title: "The Promised Neverland",
		titleJP: "約束のネバーランド",
		genre: "Trinh thám",
		author: "Kaiu Shirai / Posuka Demizu",
		coverUrl:
			"https://uploads.mangadex.org/covers/46e9cae5-4407-4576-9b9e-4c517ae9298e/e023b6b0-76c7-4dfd-8ec2-ce7a26b90a05.jpg.512.jpg",
		coverFallback: "#0d1a0d",
		rating: 4.7,
		views: "11.3M",
		status: "Hoàn thành",
		year: 2016,
		synopsis:
			"Emma, Norman và Ray — những đứa trẻ thông minh nhất trại mồ côi Grace Field House. Một ngày, chúng phát hiện sự thật kinh hoàng: trại không phải nhà mà là nông trại nuôi trẻ em làm thức ăn cho quỷ. Ba đứa trẻ lên kế hoạch trốn thoát cùng tất cả anh chị em.",
		tags: ["Thriller", "Sci-Fi", "Shounen", "Weekly Shōnen Jump"],
		mangadexId: "46e9cae5-4407-4576-9b9e-4c517ae9298e",
		chapters: [
			ch(
				1,
				"Grace Field House",
				"08/2016",
				54,
				"2b45d79b-8ddf-4253-9b11-266de00fe99b",
			),
			ch(2, "Bí mật sau cánh cổng", "09/2016", 46),
			ch(3, "Kế hoạch trốn thoát", "10/2016", 42),
			ch(4, "Kẻ phản bội", "11/2016", 48),
			ch(5, "Đêm trước tự do", "12/2016", 50),
		],
	},
];
