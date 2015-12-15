#include "mainwindow.h"
#include "ui_mainwindow.h"

void MainWindow::sendToJS()
{
  Structure s[2];

  s[0].ua[0].uchar[0]  = 255;
  s[0].ua[0].uchar[1]  = 255;
  s[0].ua[0].ushort[0] = 65535;
  s[0].ua[0].ushort[1] = 65535;
  s[0].ua[0].uint[0]   = 4294967295;
  s[0].ua[0].uint[1]   = 4294967295;
  s[0].ua[1].uchar[0]  = 255;
  s[0].ua[1].uchar[1]  = 255;
  s[0].ua[1].ushort[0] = 65535;
  s[0].ua[1].ushort[1] = 65535;
  s[0].ua[1].uint[0]   = 4294967295;
  s[0].ua[1].uint[1]   = 4294967295;
  s[0].sa.schar[0]     = -127;
  s[0].sa.schar[1]     = -127;
  s[0].sa.sshort[0]    = -32768;
  s[0].sa.sshort[1]    = -32768;
  s[0].sa.sint[0]      = -2147483648;
  s[0].sa.sint[1]      = -2147483648;
  s[0].sa.sfloat[0]    = -1.175;
  s[0].sa.sfloat[1]    = -1.175;
  s[0].sa.sdouble[0]   = -2.225;
  s[0].sa.sdouble[1]   = -2.225;
  s[0].s1.sint         = 1;
  s[0].s1.s2.sint      = 2;

  s[1].ua[0].uchar[0]  = 255;
  s[1].ua[0].uchar[1]  = 255;
  s[1].ua[0].ushort[0] = 65535;
  s[1].ua[0].ushort[1] = 65535;
  s[1].ua[0].uint[0]   = 4294967295;
  s[1].ua[0].uint[1]   = 4294967295;
  s[1].ua[1].uchar[0]  = 255;
  s[1].ua[1].uchar[1]  = 255;
  s[1].ua[1].ushort[0] = 65535;
  s[1].ua[1].ushort[1] = 65535;
  s[1].ua[1].uint[0]   = 4294967295;
  s[1].ua[1].uint[1]   = 4294967295;
  s[1].sa.schar[0]     = -127;
  s[1].sa.schar[1]     = -127;
  s[1].sa.sshort[0]    = -32768;
  s[1].sa.sshort[1]    = -32768;
  s[1].sa.sint[0]      = -2147483648;
  s[1].sa.sint[1]      = -2147483648;
  s[1].sa.sfloat[0]    = -1.175;
  s[1].sa.sfloat[1]    = -1.175;
  s[1].sa.sdouble[0]   = -2.225;
  s[1].sa.sdouble[1]   = -2.225;
  s[1].s1.sint         = 1;
  s[1].s1.s2.sint      = 2;


  QByteArray raw = QByteArray((char*)&s, sizeof(Structure)*2);


  if(!clients.isEmpty())
  {
    clients[0]->sendBinaryMessage(raw);
  }
}

void MainWindow::bindJS()
{
  const size_t n = 4096;
  int array[n];

  for(size_t i = 0; i < n; ++i)
  {
    array[i] = i;
  }

  view->page()->runJavaScript(QString("bind(%1);").arg(*array));

}

MainWindow::MainWindow(QWidget *parent) :
  QMainWindow(parent),
  ui(new Ui::MainWindow)
{
  ui->setupUi(this);
  qputenv("QTWEBENGINE_REMOTE_DEBUGGING", "9000");

  socketTimer = new QTimer(this);
  connect(socketTimer, &QTimer::timeout, this, &MainWindow::socketTimerTick);
  bindTimer = new QTimer(this);
  connect(bindTimer, &QTimer::timeout, this, &MainWindow::bindTimerTick);


  //view = new QWebEngineView(this);
  //ui->verticalLayout_3->addWidget(view);
  //view->setGeometry(0, 0, this->width(), this->height());
  //view->load(QUrl("file:///" + QApplication::applicationDirPath() + "/index.html"));

  wsServer = new QWebSocketServer("Local non-ssl server", QWebSocketServer::NonSecureMode, this);
  port     = 2015;

  if(wsServer->listen(QHostAddress::Any, port))
  {
    qDebug() << "Echoserver listening on port" << port;

    connect(wsServer, &QWebSocketServer::newConnection, this, &MainWindow::newConnection);
    connect(wsServer, &QWebSocketServer::closed,        this, &MainWindow::connectionClosed);
  }
}

MainWindow::~MainWindow()
{
  delete ui;
}

void MainWindow::socketTimerTick()
{
  sendToJS();
}
void MainWindow::bindTimerTick()
{
  bindJS();
}
void MainWindow::on_socketButton_clicked()
{
  socketTimer->start(1000);
}
void MainWindow::on_socketStopButton_clicked()
{
  socketTimer->stop();
}
void MainWindow::on_bindButton_clicked()
{
  bindTimer->start(1000);
}
void MainWindow::on_bindStopButton_clicked()
{
  bindTimer->stop();
}
void MainWindow::newConnection()
{
  QWebSocket *pSocket = wsServer->nextPendingConnection();

  connect(pSocket, &QWebSocket::textMessageReceived,   this, &MainWindow::processTextMessage);
  connect(pSocket, &QWebSocket::binaryMessageReceived, this, &MainWindow::processBinaryMessage);
  connect(pSocket, &QWebSocket::disconnected,          this, &MainWindow::socketDisconnected);

  clients << pSocket;
}

void MainWindow::connectionClosed()
{

}

void MainWindow::processTextMessage(QString message)
{
  QWebSocket *pClient = qobject_cast<QWebSocket *>(sender());

  qDebug() << "Text message received:" << message;

  if (pClient)
  {
    pClient->sendTextMessage(message);
  }
}

void MainWindow::processBinaryMessage(QByteArray message)
{
  QWebSocket *pClient = qobject_cast<QWebSocket *>(sender());

  qDebug() << "Binary Message received:" << message.length();

  int mode = 0;
  Structure s1[2];
  Structure s2[2];
  double array[10][10][10];

  switch(mode)
  {
    case 0:
      memcpy(&s1, message.constData(), sizeof(Structure) * 2);
      qDebug() << s1[0].sa.sfloat[0];
      qDebug() << s1[0].ua[0].ushort[0];

      if (pClient)
      {
        pClient->sendBinaryMessage(message);
      }
    break;

    case 1:
      memcpy(&s2, message.constData(), sizeof(Structure) * 2);
      qDebug() << s2[0].sa.sfloat[0];
      qDebug() << s2[0].ua[0].ushort[0];
      qDebug() << s2[1].sa.sfloat[0];
      qDebug() << s2[1].ua[0].ushort[0];

      if (pClient)
      {
        pClient->sendBinaryMessage(message);
      }
    break;

    case 2:
      memcpy(array, message.constData(), sizeof(array));
      for(int i = 0; i < 10; ++i)
      {
        for(int j = 0; j < 10; ++j)
        {
          for(int k = 0; k < 10; ++k)
          {
            qDebug() << i << j << k << ":" << array[i][j][k];
          }
        }
      }
    break;
  }
}

void MainWindow::socketDisconnected()
{
  QWebSocket *pClient = qobject_cast<QWebSocket *>(sender());

  qDebug() << "socketDisconnected:" << pClient;

  if (pClient)
  {
    clients.removeAll(pClient);
    pClient->deleteLater();
  }
}
