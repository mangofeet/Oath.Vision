import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, ModalController, AlertController } from '@ionic/angular';

import * as Clipboard from 'clipboard';

import { ChronicleService } from '../../services/chronicle.service';
import { CardSuits, Chronicle, determineTypeForCard, OathGame, Suit, Site } from '../../interfaces';
import { UIService } from '../../services/ui.service';
import { ViewCardComponent } from '../../components/modals/view-card/view-card.component';
import { ChildrenChroniclesComponent } from '../../components/modals/childrenchronicles/childrenchronicles.component';

@Component({
  selector: 'app-view-chronicle',
  templateUrl: './view-chronicle.page.html',
  styleUrls: ['./view-chronicle.page.scss'],
})
export class ViewChroniclePage implements OnInit {

  @ViewChild('seedBtn', { static: false }) seedBtn: IonButton;

  public chronicle: Chronicle;
  public chronicleParsedData: OathGame;

  public childChronicles: Chronicle[] = [];

  public suitOrder: Array<{ suit: string, ref: Suit }> = [
    { suit: 'arcane',   ref: Suit.Arcane },
    { suit: 'beast',    ref: Suit.Beast },
    { suit: 'discord',  ref: Suit.Discord },
    { suit: 'hearth',   ref: Suit.Hearth },
    { suit: 'nomad',    ref: Suit.Nomad },
    { suit: 'order',    ref: Suit.Order }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private uiService: UIService,
    public chronicleService: ChronicleService
  ) { }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    const loading = await this.uiService.loading();
    await loading.present();

    this.chronicleService.getChronicle(id).subscribe(c => {

      this.chronicle = c;

      try {
        this.chronicleParsedData = this.chronicleService.parseChronicle(c.seed);
      } catch {}

      if (!c || !this.chronicleParsedData) {
        this.router.navigate(['/']);
        return;
      }

      this.chronicleService.getChildChronicles(id).subscribe(children => {
        this.childChronicles = children;
      });

      setTimeout(() => {
        const clipboard = new Clipboard((this.seedBtn as any).el);
        clipboard.on('success', () => {
          this.uiService.toast('Copied seed to clipboard!');
        });
      });

      loading.dismiss();

    });
  }

  playerCitizenshipString(color: string): string {
    if (!this.chronicleParsedData) { return 'Player'; }
    return this.chronicleParsedData.playerCitizenship[color];
  }

  determineTypeForCard(cardName: string): string {
    return determineTypeForCard(cardName);
  }

  async viewCard(cardName: string) {
    const cardType = this.determineTypeForCard(cardName);
    if (cardType !== 'relic') {
      return this.viewSpecificCard(cardName, cardType);
    }
    return this.viewSpecificSpoilerCard(cardName, cardType);
  }

  async viewSite(site: Site) {
    if (!site.ruined) {
      return this.viewSpecificCard(site.name, 'site');
    }
    return this.viewSpecificSpoilerCard(site.name, 'site');
  }

  async viewSpecificSpoilerCard(cardName: string, type: string) {

    if (this.childChronicles.length > 0) {
      return this.viewSpecificCard(cardName, type);
    }

    const alert = await this.alertCtrl.create({
      header: 'Spoiler Warning!',
      message: 'This card contains spoilers for this chronicle. Are you sure you want to see it?',
      buttons: ['Cancel', {
        text: 'Continue',
        handler: () => this.viewSpecificCard(cardName, type)
      }]
    });

    await alert.present();

  }

  async viewSpecificCard(cardName: string, type: string) {
    const modal = await this.modalCtrl.create({
      component: ViewCardComponent,
      componentProps: {
        cardName,
        cardType: type
      }
    });

    return modal.present();
  }

  async loadChildren() {
    const modal = await this.modalCtrl.create({
      component: ChildrenChroniclesComponent,
      componentProps: {
        children: this.childChronicles
      }
    });

    modal.onDidDismiss().then(res => {
      if (!res || !res.data) { return; }
      this.router.navigate(['/view-chronicle', res.data.id]);
    });

    await modal.present();
  }

  public getCountInDeckForSuit(suit: Suit) {
    const cards = this.chronicleParsedData.world.filter(c => CardSuits[c.name] === suit);
    return cards.length;
  }

}
