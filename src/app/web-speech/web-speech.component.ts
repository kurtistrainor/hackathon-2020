import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BehaviorSubject, merge, Observable, of, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { defaultLanguage, languages } from '../shared/model/languages';
import { SpeechError } from '../shared/model/speech-error';
import { SpeechEvent } from '../shared/model/speech-event';
import { SpeechRecognizerService } from '../shared/services/web-apis/speech-recognizer.service';
import { ActionContext } from '../shared/services/actions/action-context';
import { SpeechNotification } from '../shared/model/speech-notification';
import { STATECHANGE, Caption } from '../shared/model/action';
import { HttpClient } from '@angular/common/http';
//@ts-ignore
import { getSubtitles } from 'youtube-captions-scraper';
//@ts-ignore
import * as stringSimilarity from 'string-similarity';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { GradeComponent } from '../shared/components/grade/grade';

@Component({
  selector: 'hack-web-speech',
  templateUrl: './web-speech.component.html',
  styleUrls: ['./web-speech.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebSpeechComponent implements OnInit {
  languages: string[] = languages;
  currentLanguage: string = defaultLanguage;
  videoId = "ypB9a1gMS9E";
  captions: Caption[] = [];
  player: any;
  reportCard?: string;
  transcript$?: Observable<string>;
  listening$?: Observable<boolean>;
  errorMessage$?: Observable<string>;
  defaultError$ = new Subject<string | undefined>();
  endOfCaption?: number;
  caption$ = new BehaviorSubject<Caption>({
    dur: "0",
    start: "0",
    text: "loading..."
  });

  constructor(
    private speechRecognizer: SpeechRecognizerService,
    private actionContext: ActionContext,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const webSpeechReady = this.speechRecognizer.initialize(this.currentLanguage);
    if (webSpeechReady) {
      this.initRecognition();
      this.initApi();
    }else {
      this.errorMessage$ = of('Your Browser is not supported. Please try Google Chrome.');
    }
  }

  ytReady(event: any): void {
    this.player = event.target;
  }

  ytStateChange(event: any): void {
    const type: STATECHANGE = event.data;
    switch (type) {
      case STATECHANGE.PLAYING:
        if (this.caption$.value)
        {
          this.transcript$ = undefined;  
          this.stop();
        }
        const time = event.target.getCurrentTime();
        const closest = this.captions.reduce(function(prev, curr) {
          return (Math.abs(parseInt(curr.start) - time) < Math.abs(parseInt(prev.start) - time) ? curr : prev);
        }) ?? null;
        const index = this.captions.indexOf(closest);
        const next = this.captions[index + 1];
        const nextStart = parseFloat(next.start)
        this.caption$.next(closest);
        this.endOfCaption = setTimeout(() => {
          // if answered, don't pause
          event.target.pauseVideo();
        }, (nextStart - time) * 1000);
        
        console.log(time);
        console.log(closest);
        console.log(next);
        break;
      case STATECHANGE.PAUSED:        
        if (this.caption$.value)
        {
          this.initRecognition();
          this.start();
        }
        clearTimeout(this.endOfCaption);
        break;
    }
    //console.log("ytStateChange", event)
  }

  ytApiChange(event: any): void {
    //console.log("ytApiChange", event)

  }

  start(): void {
    if (this.speechRecognizer.isListening) {
      this.stop();
      return;
    }

    this.defaultError$.next(undefined);
    this.speechRecognizer.start();
  }

  stop(): void {
    this.speechRecognizer.stop();
  }

  selectLanguage(language: string): void {
    if (this.speechRecognizer.isListening) {
      this.stop();
    }
    this.currentLanguage = language;
    this.speechRecognizer.setLanguage(this.currentLanguage);
  }

  private async initApi(): Promise<void> {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
    this.captions = await getSubtitles({ videoID: this.videoId });
    if (this.captions.length) this.caption$.next(this.captions[0])
    else alert("No captions found!");
  }

  private initRecognition(): void {
    this.transcript$ = this.speechRecognizer.onResult().pipe(
      tap((notification) => {
        this.processNotification(notification);
      }),
      map((notification) => notification.content || '')
    );

    this.listening$ = merge(
      this.speechRecognizer.onStart(),
      this.speechRecognizer.onEnd()
    ).pipe(map((notification) => notification.event === SpeechEvent.Start));

    this.errorMessage$ = merge(
      this.speechRecognizer.onError(),
      this.defaultError$
    ).pipe(
      map((data) => {
        if (data === undefined) {
          return '';
        }
        if (typeof data === 'string') {
          return data;
        }
        let message;
        switch (data.error) {
          case SpeechError.NotAllowed:
            message = `Cannot run the demo.
            Your browser is not authorized to access your microphone.
            Verify that your browser has access to your microphone and try again.`;
            break;
          case SpeechError.NoSpeech:
            message = `No speech has been detected. Please try again.`;
            break;
          case SpeechError.AudioCapture:
            message = `Microphone is not available. Plese verify the connection of your microphone and try again.`;
            break;
          default:
            message = '';
            break;
        }
        return message;
      })
    );
  }

  private processNotification(notification: SpeechNotification<string>): void {
    if (notification.event === SpeechEvent.FinalContent) {
      const message = notification.content?.trim() || '';
      const target = this.caption$.value?.text?.trim() || '';
      this.actionContext.processMessage(message, this.currentLanguage);
      const grade: number = stringSimilarity.compareTwoStrings(message, target);
      if (grade === 1)
        this.showGrade("PERFECT")
      else if (grade > 0.9)
        this.showGrade("A+")
        else if (grade > 0.8)
        this.showGrade("A")
      else if (grade > 0.7)
        this.showGrade("B")
      else if (grade > 0.6)
        this.showGrade("C")
      else if (grade > 0.5) 
        this.showGrade("D")
      else if (grade >= 0)
        this.showGrade("FAILURE")
      // this.actionContext.runAction(message, this.currentLanguage);
    }
  }
  
  private showGrade(grade: string) {
    this.stop();
    this.reportCard = this.reportCard ? `${this.reportCard}\n${grade}` : grade;
    this.dialog.open(GradeComponent, {data: {
      grade,
      reportCard: this.reportCard
    }});
    this.dialog.afterAllClosed.subscribe(() => {
      const index = this.captions.indexOf(this.caption$.value);
      this.player.seekTo(parseFloat(this.captions[index+1].start));
      this.player.playVideo();
    })
  }
}
