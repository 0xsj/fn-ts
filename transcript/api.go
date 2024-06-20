package main

import (
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
)

var logger = log.New(log.Writer(), "", log.LstdFlags)

type YouTubeTranscriptAPI struct{}

type TranscriptEntry struct {
	Text     string
	Start    float64
	Duration float64
}

type TranscriptParser struct {
	PlainData string
}

func (api *YouTubeTranscriptAPI) Get(videoIds ...string) map[string][]TranscriptEntry {
	data := make(map[string][]TranscriptEntry)

	for _, videoId := range videoIds {
		transcript, err := fetchTranscript(videoId)
		if err != nil {
			logger.Printf("Could not get the transcript for the video %s: %v\n", videoId, err)
			continue
		}

		data[videoId] = parseTranscript(transcript)
	}

	return data
}

func fetchTranscript(videoId string) (string, error) {
	resp, err := http.Get(fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoId))
	if err != nil {
		return "", fmt.Errorf("error fetching video: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)

	if err != nil {
		return "", fmt.Errorf("error reading response body: %v", err)
	}

	fetchedSite := string(body)

	timedTextURLStart := regexp.MustCompile("timedtext").FindStringIndex(fetchedSite)
	if len(timedTextURLStart) == 0 {
		return "", fmt.Errorf("timedtext URL not found")
	}

	apiURL := fmt.Sprintf("https://www.youtube.com/api/%s", fetchedSite[timedTextURLStart[0]:timedTextURLStart[1]])
	apiURL = regexp.MustCompile(`\\u0026`).ReplaceAllString(apiURL, "&")
	apiURL = regexp.MustCompile(`\\`).ReplaceAllString(apiURL, "")

	transcriptResponse, err := http.Get(apiURL)
	if err != nil {
		return "", fmt.Errorf("error fetching transcript: %v", err)
	}
	defer transcriptResponse.Body.Close()

	transcriptBody, err := io.ReadAll(transcriptResponse.Body)
	if err != nil {
		return "", fmt.Errorf("error reading transcript body: %v", err)
	}

	return string(transcriptBody), nil
}

func parseTranscript(plainData string) []TranscriptEntry {
	logger.Printf("parsing transcript")
	var parser TranscriptParser
	parser.PlainData = plainData
	return parser.parse()
}

func (parser *TranscriptParser) parse() []TranscriptEntry {
	var entries []TranscriptEntry
	err := xml.Unmarshal([]byte(parser.PlainData), &entries)
	if err != nil {
		logger.Println("Error parsing transcript:", err)
		return nil
	}
	return entries
}
