import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Inject } from '@angular/core';
import { confetti } from 'dom-confetti';

@Component({
    selector: "dialog-grade",
    templateUrl: './grade.html',
})
export class GradeComponent implements OnInit {
    grade!: string;
    reportCard!: string;
    constructor(public dialogRef: MatDialogRef<GradeComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
        this.grade = data.grade;
        this.reportCard = data.reportCard;
     }

     ngOnInit() {
         if (this.grade === "PERFECT") {
            confetti(document.getElementById("grade-container") || document.body);
            var audio = new Audio();
            audio.src = "assets/cheering.mp3";
            audio.load();
            audio.play();
         }
         else if (this.grade === "FAILURE") {
            var audio = new Audio();
            audio.src = "assets/failure.mp3";
            audio.load();
            audio.play();
         }
     }
    close() {
        this.dialogRef.close();
    }
}