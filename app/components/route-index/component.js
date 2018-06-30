import Component from '@ember/component';

export default Component.extend({
  url: '',
  progress: 0,
  statusClass: '',
  status: '',
  disabled: Ember.computed('url', function() {
    return !(this.get('url') && /(?:^|\s)((https?:\/\/)?(?:localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(\/\S*)?)/.test(this.get('url')));
  }),

  setStatus(status, statusClass = 'light') {
    this.setProperties({
      status,
      statusClass
    });

    setTimeout(() => this.set('status', ''), 1750);
  },

  actions: {
    download() {
      return new Ember.RSVP.Promise((resolve, reject) => {
        const { remote } = requireNode('electron');
        const path = requireNode('path');
        const fs = requireNode('fs');
        const youtubedl = requireNode('youtube-dl');

        youtubedl.getInfo(this.get('url'), (err, info) => {
          if (err) {
            this.setStatus('Sorry, looks like that URL isn\'t supported.', 'danger');
            reject();
            return;
          }

          remote.dialog.showSaveDialog(remote.getCurrentWindow(), {
            defaultPath: path.join(remote.app.getPath('downloads'), `${info.title}.${info.ext}`)
          }, (fileName) => {
            if (!fileName) {
              reject();
              return;
            }
            const download = youtubedl(this.get('url'), [], {
              cwd: __dirname,
              maxBuffer: Infinity
            });

            let statusCheck;

            download.on('info', (info) => statusCheck = setInterval(() => this.set('progress', (fs.statSync(fileName).size / info.size * 100).toFixed(2)), 1000));

            download.on('end', () => {
              clearInterval(statusCheck);
              this.set('progress', 0);
              this.setStatus('Downloading complete.');
              resolve();
            });

            download.pipe(fs.createWriteStream(fileName));
          });
        });
      });
    }
  }
});
