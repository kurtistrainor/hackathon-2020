import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSpeechComponent } from './web-speech.component';
import { MaterialModule } from '../shared/material/material.module';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [WebSpeechComponent],
  imports: [
    CommonModule,
    MaterialModule,
    YouTubePlayerModule,
    HttpClientModule
  ]
})
export class WebSpeechModule { }
