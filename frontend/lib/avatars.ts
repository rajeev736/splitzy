export interface AvatarOption {
  id: string
  label: string
  src: string
  category: "boys" | "girls"
}

export const BOY_AVATARS: AvatarOption[] = [
  { id: "boy_1", label: "Boy 1", src: "/avatars/1_boy.png", category: "boys" },
  { id: "boy_2", label: "Boy 2", src: "/avatars/2_boy.png", category: "boys" },
  { id: "boy_3", label: "Boy 3", src: "/avatars/3_boy.png", category: "boys" },
  { id: "boy_4", label: "Boy 4", src: "/avatars/4_boy.png", category: "boys" },
  { id: "boy_5", label: "Boy 5", src: "/avatars/5_boy.png", category: "boys" },
  { id: "boy_6", label: "Boy 6", src: "/avatars/6_boy.png", category: "boys" },
  { id: "boy_7", label: "Boy 7", src: "/avatars/7_boy.png", category: "boys" },
  { id: "boy_8", label: "Boy 8", src: "/avatars/8_boy.png", category: "boys" },
  { id: "boy_9", label: "Boy 9", src: "/avatars/9_boy.png", category: "boys" },
  { id: "boy_10", label: "Boy 10", src: "/avatars/10_boy.png", category: "boys" },
  { id: "boy_11", label: "Boy 11", src: "/avatars/11_boy.png", category: "boys" },
  { id: "boy_12", label: "Boy 12", src: "/avatars/12_boy.png", category: "boys" },
]

export const GIRL_AVATARS: AvatarOption[] = [
  { id: "girl_1", label: "Girl 1", src: "/avatars/1_girl.png", category: "girls" },
  { id: "girl_2", label: "Girl 2", src: "/avatars/2_girl.png", category: "girls" },
  { id: "girl_3", label: "Girl 3", src: "/avatars/3_girl.png", category: "girls" },
  { id: "girl_4", label: "Girl 4", src: "/avatars/4_girl.png", category: "girls" },
  { id: "girl_5", label: "Girl 5", src: "/avatars/5_girl.png", category: "girls" },
  { id: "girl_6", label: "Girl 6", src: "/avatars/6_girl.png", category: "girls" },
  { id: "girl_7", label: "Girl 7", src: "/avatars/7_girl.png", category: "girls" },
  { id: "girl_8", label: "Girl 8", src: "/avatars/8_girl.png", category: "girls" },
  { id: "girl_9", label: "Girl 9", src: "/avatars/9_girl.png", category: "girls" },
  { id: "girl_10", label: "Girl 10", src: "/avatars/10_girl.png", category: "girls" },
  { id: "girl_11", label: "Girl 11", src: "/avatars/11_girl.png", category: "girls" },
]

export const ALL_AVATARS: AvatarOption[] = [...BOY_AVATARS, ...GIRL_AVATARS]

export const DEFAULT_AVATAR = BOY_AVATARS[0].src
