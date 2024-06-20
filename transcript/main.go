package main

import "fmt"

func main() {
	yt := &YouTubeTranscriptAPI{}

	// https://www.youtube.com/watch?v=BY81yNttfpg

	data := yt.Get("BY81yNttfpg")
	fmt.Println(data)
}
