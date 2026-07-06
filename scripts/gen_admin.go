package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"

	"golang.org/x/crypto/bcrypt"
)

var defaultSecretKey = []byte("ruivobarber_secure_aes_32_bytes!")

func encrypt(text string) (string, error) {
	if text == "" {
		return "", nil
	}
	block, err := aes.NewCipher(defaultSecretKey)
	if err != nil {
		return "", err
	}
	plaintext := []byte(text)
	ciphertext := make([]byte, aes.BlockSize+len(plaintext))
	iv := ciphertext[:aes.BlockSize]
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}
	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[aes.BlockSize:], plaintext)
	return base64.URLEncoding.EncodeToString(ciphertext), nil
}

func main() {
	// Gera hash bcrypt da senha
	hash, err := bcrypt.GenerateFromPassword([]byte("agadmin"), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}
	fmt.Println("BCRYPT:", string(hash))

	// Criptografa o telefone
	enc, err := encrypt("5561999496399")
	if err != nil {
		panic(err)
	}
	fmt.Println("TELEFONE_ENC:", enc)
}
