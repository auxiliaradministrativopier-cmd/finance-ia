import { avatarFileName, validateAvatarFile } from "../avatar";

describe("validateAvatarFile", () => {
  it("aceita JPG, PNG e WEBP de até 5 MB", () => {
    expect(validateAvatarFile({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(validateAvatarFile({ type: "image/webp", size: 5 * 1024 * 1024 })).toBeNull();
  });

  it("explica o que está errado", () => {
    expect(validateAvatarFile({ type: "application/pdf", size: 10 })).toBe(
      "Use uma imagem JPG, PNG ou WEBP.",
    );
    expect(validateAvatarFile({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toBe(
      "A imagem precisa ter até 5 MB.",
    );
  });

  it("dá a extensão certa ao arquivo", () => {
    expect(avatarFileName("image/png")).toBe("avatar.png");
    expect(avatarFileName("image/jpeg")).toBe("avatar.jpg");
  });
});
