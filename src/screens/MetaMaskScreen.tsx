import React, { Component } from 'react'
import { StyleSheet, View } from 'react-native'
import { Navigation } from 'react-native-navigation'
import WKWebView, { WKWebViewMessage } from 'react-native-wkwebview-reborn'
import injection from '../injections/metaMaskPopup'
import { sharedIPC as ipc } from '../ipc'

const manifest = require('../../web/metamask/manifest.json')

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'stretch'
  },
  webview: {
    flex: 1,
    backgroundColor: '#f7f7f7'
  }
})

const injectedJavaScript = `
  (${injection.toString()})(window, document, ${JSON.stringify(manifest)})
`

export interface Props {
  navigator: any
}

export default class MetaMaskScreen extends Component<Props> {
  static navigatorButtons = {
    rightButtons: [
      {
        title: 'Close',
        id: 'close'
      }
    ]
  }

  refs: {
    webview: WKWebView
  }

  connections: { [id: string]: boolean } = {}

  componentDidMount () {
    const { navigator } = this.props
    navigator.setOnNavigatorEvent(this.handleNavigatorEvent)
  }

  componentWillUnmount () {
    Object.keys(this.connections).forEach(function (id) {
      ipc.disconnect(id)
    })
  }

  handleNavigatorEvent = event => {
    if (event.type === 'NavBarButtonPress' && event.id === 'close') {
      Navigation.dismissModal({})
    }
  }

  handleMessage = (msg: WKWebViewMessage): void => {
    console.log('popup message received', msg)
    const body = msg.body
    switch (body.action) {
      case 'connect':
        ipc.connect(body.name, body.id, body.url, this.refs.webview)
        this.connections[body.id] = true
        return

      case 'disconnect':
        ipc.disconnect(body.id)
        delete this.connections[body.id]
        return

      case 'message':
        ipc.sendToBackground(body.id, body.data)
    }
  }

  render () {
    return (
      <View style={styles.container}>
        <WKWebView
          ref='webview'
          style={styles.webview}
          source={{ uri: 'app://metamask/popup.html' }}
          runJavaScriptAtDocumentEnd={injectedJavaScript}
          runJavaScriptInMainFrameOnly
          onMessage={this.handleMessage}
        />
      </View>
    )
  }
}
