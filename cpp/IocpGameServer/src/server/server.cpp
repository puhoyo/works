#include <stdio.h>
#include <stdlib.h>
#include <process.h>
#include <WinSock2.h>
#include <Windows.h>
#include <iostream>
#include <string>
#include <thread>

#include "../app/application.hpp"
#include "include/server.hpp"
#include "../app/lib/include/user.hpp"
#include "../app/apis/include/packet_handler_base.hpp"
#include "../app/apis/include/error.hpp"
#include "../server/include/packet.hpp"
#include "../server/include/socket.hpp"

namespace IocpGameServer {

	DWORD IOCPThreadMain(LPVOID iocp, std::shared_ptr<Application> app) {
		HANDLE hComPort = (HANDLE)iocp;
		DWORD bytesTrans;
		Socket* p_socket;
		Packet* packet;
		DWORD flags = 0;

		while (true) {
			GetQueuedCompletionStatus(hComPort, &bytesTrans, (PUINT_PTR)&p_socket, reinterpret_cast<LPOVERLAPPED*>(&packet), INFINITE);
			app->Console("IO Complete!");
			auto socket = p_socket->shared_from_this();

			if (socket != nullptr) {
				if (packet->GetRwMode() == Packet::kReadMode) {
					//클라이언트로부터 메시지를 받은 경우에 대한 처리
					if (bytesTrans == 0) {
						//EOF 전송 시
						app->Console("EOF");
						if (socket->IsDisconnected()) {
							// 서버에서 이미 강제로 끊은 상태
						}
						else {
							// 클라에서 연결 종료를 요청함
							socket->Disconnect();
						}
					}
					else {
						auto protocol = packet->GetProtocol();
						// 클라이언트로부터 메시지를 받았으므로 no action 타이머를 초기화
						socket->NotifyNoActionTimer();

						// 패킷을 단시간에 너무 많이 보내는 클라에 대한 처리
						if (!CheckTooManyPackets(socket)) {
							socket->Disconnect();
						}
						else {
							if (protocol == 1) {
								// 로그인 request
								app->Console("login request");
								auto success = User::CreateUser(socket, packet->GetPacketData());
								if (success) {
									app->Console("login success");
									//socket->Send(1);
								}
								else {
									socket->Send(Error::kProtocol, "login failed");
								}
							}

							if (socket->GetUser() == nullptr) {
								socket->Send(Error::kProtocol, "login first");
								socket->Disconnect();
							}
							else {
								app->GetPacketHandler(protocol).handle(socket->GetUser(), packet->GetPacketData());
								socket->Receive();
							}
						}
					}
				}
				else {

				}
			}
			delete packet;
		}
		return 0;
	}

	const bool CheckTooManyPackets(std::shared_ptr<Socket> socket) {

		const auto packet_count = socket->IncrementPacketCount();
		
		if (packet_count > kWarningPacketCount) {
			if (packet_count > kMaximumPacketCount) { //force disconnect
				return false;
			}
			else {//send as warning
				socket->Send(Error::kProtocol, "too many request");
			}
		}

		return true;
	}
} //namespace IocpGameServer